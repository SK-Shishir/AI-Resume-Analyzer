import os
import re
import uuid
from flask import Blueprint, request, jsonify, send_file
from config import supabase
from services.parser import parse_resume
from services.algorithm import analyze_resume_text
from services.gemini import fetch_job_requirements, generate_improved_resume
from services.docx_generator import generate_resume_docx

resume_bp = Blueprint('resume', __name__)

@resume_bp.route('/analyze', methods=['POST'])
def analyze_resume():
    try:
        # Check file
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
            
        job_title = request.form.get('job_title', '').strip()
        if not job_title:
            job_title = "Software Engineer"
            
        company_name = request.form.get('company_name', '').strip()
        display_role = f"{job_title} @ {company_name}" if company_name else job_title
        
        job_description = request.form.get('job_description', '').strip()
            
        user_id = request.form.get('user_id', '').strip()
        if not user_id and supabase:
            # Fallback to an existing user so not-null constraint in resumes/analyses table is satisfied
            try:
                users_res = supabase.table('users').select('id').order('created_at', desc=True).limit(1).execute()
                if users_res.data:
                    user_id = users_res.data[0]['id']
            except Exception:
                pass
            
        filename = file.filename
        file_bytes = file.read()
        file_size = len(file_bytes)
        file_ext = os.path.splitext(filename)[1].lower().replace('.', '')
        
        # 1. Extract text from PDF / DOCX
        try:
            raw_text = parse_resume(file_bytes, filename)
        except Exception as e:
            return jsonify({"error": f"Failed to extract text: {str(e)}"}), 400
            
        if not raw_text or len(raw_text.strip()) < 50:
            return jsonify({
                "error": "The resume appears to be empty or contains scanned images without selectable text. Please upload a standard text PDF or DOCX."
            }), 400

        # 2. Gemini AI: Fetch requirements for the target job role and company (plus JD circular if provided)
        job_info = fetch_job_requirements(job_title, company_name, job_description)
        required_skills = job_info.get("required_skills", [])

        # 3. Custom Algorithm: ATS Score, Match Score, Content Score & Skill Gap
        analysis_result = analyze_resume_text(raw_text, job_title, required_skills)

        # 4. Gemini AI: Generate improved CV tailored to the job, company, and JD circular
        improved_cv = generate_improved_resume(
            raw_cv_text=raw_text,
            target_job=job_title,
            missing_skills=analysis_result["missing_skills"],
            suggestions=analysis_result["suggestions"],
            company_name=company_name,
            job_description=job_description
        )

        # 5. Save to Supabase (if configured)
        resume_id = str(uuid.uuid4())
        analysis_id = str(uuid.uuid4())
        
        if supabase:
            try:
                # Save into resumes table
                resume_record = {
                    "id": resume_id,
                    "file_name": filename,
                    "file_url": "",
                    "file_type": file_ext,
                    "file_size": file_size,
                    "raw_text": raw_text[:10000], # store text sample/full
                    "status": "analyzed"
                }
                if user_id:
                    try:
                        uuid.UUID(user_id)
                        resume_record["user_id"] = user_id
                    except (ValueError, AttributeError):
                        pass
                    
                supabase.table('resumes').insert(resume_record).execute()

                # Save into analyses table
                analysis_record = {
                    "id": analysis_id,
                    "resume_id": resume_id,
                    "job_title": display_role,
                    "resume_score": analysis_result["resume_score"],
                    "ats_score": analysis_result["ats_score"],
                    "content_score": analysis_result["content_score"],
                    "match_score": analysis_result["match_score"],
                    "matched_skills": analysis_result["matched_skills"],
                    "missing_skills": analysis_result["missing_skills"],
                    "job_requirements": job_info,
                    "suggestions": analysis_result["suggestions"],
                    "improved_cv": improved_cv,
                    "status": "completed"
                }
                if user_id:
                    try:
                        uuid.UUID(user_id)
                        analysis_record["user_id"] = user_id
                    except (ValueError, AttributeError):
                        pass
                    
                supabase.table('analyses').insert(analysis_record).execute()
            except Exception as db_err:
                print(f"Supabase save warning: {db_err}")

        # Return full analysis response
        return jsonify({
            "message": "Resume analyzed successfully!",
            "analysis_id": analysis_id,
            "resume_id": resume_id,
            "filename": filename,
            "job_title": display_role,
            "company_name": company_name,
            "has_job_description": bool(job_description),
            "scores": {
                "resume_score": analysis_result["resume_score"],
                "ats_score": analysis_result["ats_score"],
                "match_score": analysis_result["match_score"],
                "content_score": analysis_result["content_score"],
                "word_count": analysis_result["word_count"]
            },
            "matched_skills": analysis_result["matched_skills"],
            "missing_skills": analysis_result["missing_skills"],
            "strengths": analysis_result["strengths"],
            "suggestions": analysis_result["suggestions"],
            "job_requirements": job_info,
            "improved_cv": improved_cv
        }), 200

    except Exception as e:
        print(f"Error in analyze_resume: {e}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@resume_bp.route('/export-csv', methods=['GET'])
def export_analyses_csv():
    """Export all analyses as a downloadable CSV spreadsheet."""
    import csv, io
    try:
        if not supabase:
            return jsonify({"error": "Database not connected"}), 500

        users_res = supabase.table('users').select('id, full_name, email').execute()
        user_map = {u['id']: u for u in (users_res.data or [])}

        analyses_res = supabase.table('analyses').select('*, resumes(file_name)').order('analyzed_at', desc=True).execute()
        analyses = analyses_res.data or []

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Analysis ID', 'User Name', 'User Email', 'Resume File', 'Job Title', 'ATS Score', 'Resume Score', 'Content Score', 'Match Score', 'Analyzed Date'])

        for a in analyses:
            uid = a.get('user_id')
            user_info = user_map.get(uid, {})
            resume_info = a.get('resumes') or {}
            writer.writerow([
                a.get('id', ''),
                user_info.get('full_name', 'Unknown User'),
                user_info.get('email', ''),
                resume_info.get('file_name', 'Resume.pdf'),
                a.get('job_title', 'Software Engineer'),
                a.get('ats_score', 0),
                a.get('resume_score', 0),
                a.get('content_score', 0),
                a.get('match_score', 0),
                a.get('analyzed_at', '')
            ])

        output.seek(0)
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8-sig')),
            mimetype='text/csv',
            as_attachment=True,
            download_name='CareerIntelligence_System_Report.csv'
        )
    except Exception as e:
        print(f"Error exporting CSV: {e}")
        return jsonify({"error": str(e)}), 500

@resume_bp.route('/export-docx', methods=['POST'])
def export_docx():
    """Generate and download a Word (.docx) file from provided resume text."""
    try:
        data = request.get_json() or {}
        cv_text = data.get('cv_text', '').strip()
        title = data.get('title', 'AI Enhanced Resume').strip()

        if not cv_text:
            return jsonify({"error": "No resume content provided"}), 400

        buf = generate_resume_docx(cv_text, title)
        safe_filename = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', f"{title}_Enhanced_Resume.docx")

        return send_file(
            buf,
            as_attachment=True,
            download_name=safe_filename,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    except Exception as e:
        print(f"Error exporting docx: {e}")
        return jsonify({"error": str(e)}), 500

@resume_bp.route('/analysis/<analysis_id>/docx', methods=['GET'])
def download_analysis_docx(analysis_id):
    """Retrieve analysis report by ID and download its improved CV as .docx."""
    try:
        if not supabase:
            return jsonify({"error": "Database not connected"}), 500

        if analysis_id == 'latest':
            res = supabase.table('analyses').select('job_title, improved_cv').order('analyzed_at', desc=True).limit(1).execute()
        else:
            try:
                uuid.UUID(analysis_id)
            except ValueError:
                return jsonify({"error": "Invalid analysis ID"}), 400
            res = supabase.table('analyses').select('job_title, improved_cv').eq('id', analysis_id).execute()

        if not res.data:
            return jsonify({"error": "Analysis not found"}), 404

        record = res.data[0]
        cv_text = record.get('improved_cv', '')
        title = record.get('job_title', 'Enhanced Resume')

        if not cv_text:
            return jsonify({"error": "No improved CV available for this analysis"}), 400

        buf = generate_resume_docx(cv_text, title)
        safe_filename = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', f"{title}_Resume.docx")

        return send_file(
            buf,
            as_attachment=True,
            download_name=safe_filename,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    except Exception as e:
        print(f"Error downloading docx for analysis {analysis_id}: {e}")
        return jsonify({"error": str(e)}), 500

@resume_bp.route('/analysis/<analysis_id>', methods=['GET'])
def get_analysis(analysis_id):
    """Retrieve saved analysis report by ID or 'latest'."""
    try:
        if not supabase:
            return jsonify({"error": "Database not connected"}), 500

        if analysis_id == 'latest':
            res = supabase.table('analyses').select('*, resumes(file_name, file_size, file_type)').order('analyzed_at', desc=True).limit(1).execute()
            if not res.data:
                return jsonify({"error": "No analyses found"}), 404
            return jsonify({"analysis": res.data[0]}), 200

        try:
            uuid.UUID(analysis_id)
        except (ValueError, AttributeError):
            return jsonify({"error": "Invalid analysis ID format"}), 400

        res = supabase.table('analyses').select('*, resumes(file_name, file_size, file_type)').eq('id', analysis_id).execute()
        if not res.data:
            return jsonify({"error": "Analysis not found"}), 404

        return jsonify({"analysis": res.data[0]}), 200
    except Exception as e:
        print(f"Error in get_analysis: {e}")
        return jsonify({"error": str(e)}), 500

@resume_bp.route('/analysis/<analysis_id>', methods=['DELETE'])
def delete_analysis(analysis_id):
    """Delete a saved analysis report and its associated resume if unreferenced."""
    try:
        if not supabase:
            return jsonify({"error": "Database not connected"}), 500

        # Fetch analysis to obtain resume_id
        res = supabase.table('analyses').select('id, resume_id').eq('id', analysis_id).execute()
        if not res.data:
            return jsonify({"error": "Analysis not found"}), 404

        resume_id = res.data[0].get('resume_id')

        # Delete from analyses table
        supabase.table('analyses').delete().eq('id', analysis_id).execute()

        # If resume_id exists, check if any other analysis references it
        if resume_id:
            try:
                remaining = supabase.table('analyses').select('id').eq('resume_id', resume_id).execute()
                if not remaining.data:
                    supabase.table('resumes').delete().eq('id', resume_id).execute()
            except Exception as resume_del_err:
                print(f"Warning: could not delete resume record: {resume_del_err}")

        return jsonify({"message": "Analysis deleted successfully", "id": analysis_id}), 200
    except Exception as e:
        print(f"Error deleting analysis {analysis_id}: {e}")
        return jsonify({"error": str(e)}), 500

@resume_bp.route('/admin-stats', methods=['GET'])
def get_admin_stats():
    """Retrieve system-wide analytics for admin dashboard."""
    try:
        if not supabase:
            return jsonify({
                "total_users": 0,
                "total_resumes": 0,
                "total_analyses": 0,
                "avg_ats": 0,
                "recent_uploads": []
            }), 200

        # Total Users
        users_res = supabase.table('users').select('id, full_name, email, role').execute()
        users_data = users_res.data or []
        total_users = len(users_data)
        user_map = {u['id']: u for u in users_data}

        # Total Resumes
        resumes_res = supabase.table('resumes').select('id').execute()
        total_resumes = len(resumes_res.data or [])

        # Total Analyses
        analyses_res = supabase.table('analyses').select('*, resumes(file_name, file_type)').order('analyzed_at', desc=True).execute()
        analyses_list = analyses_res.data or []
        total_analyses = len(analyses_list)

        avg_ats = 0
        if total_analyses > 0:
            avg_ats = round(sum(a.get('ats_score', 0) for a in analyses_list) / total_analyses)

        recent_uploads = []
        for a in analyses_list[:10]:
            uid = a.get('user_id')
            user_info = user_map.get(uid, {})
            resume_info = a.get('resumes') or {}
            recent_uploads.append({
                "id": a.get('id'),
                "user_name": user_info.get('full_name') or 'User',
                "user_email": user_info.get('email') or '',
                "file_name": resume_info.get('file_name') or 'Resume.pdf',
                "job_title": a.get('job_title') or 'Software Engineer',
                "date": a.get('analyzed_at'),
                "ats_score": a.get('ats_score', 0),
                "resume_score": a.get('resume_score', 0)
            })

        return jsonify({
            "total_users": total_users,
            "total_resumes": total_resumes,
            "total_analyses": total_analyses,
            "avg_ats": avg_ats,
            "recent_uploads": recent_uploads
        }), 200
    except Exception as e:
        print(f"Error fetching admin stats: {e}")
        return jsonify({"error": str(e)}), 500

@resume_bp.route('/history', methods=['GET'])
def get_user_history():
    """Retrieve history of analyses for a given user (safe UUID validation)."""
    user_id = request.args.get('user_id')
    try:
        if not supabase:
            return jsonify({"history": []}), 200

        query = supabase.table('analyses').select('*, resumes(file_name, file_size, file_type)').order('analyzed_at', desc=True)
        if user_id:
            try:
                uuid.UUID(user_id)
                query = query.eq('user_id', user_id)
            except (ValueError, AttributeError):
                # Non-UUID ID (e.g. mock user), do not crash Supabase query
                pass

        res = query.execute()
        return jsonify({"history": res.data or []}), 200
    except Exception as e:
        print(f"Error in get_user_history: {e}")
        return jsonify({"history": [], "error": str(e)}), 200

@resume_bp.route('/dashboard-stats', methods=['GET'])
def get_dashboard_stats():
    """Retrieve summarized dashboard statistics for a user."""
    user_id = request.args.get('user_id')
    try:
        if not supabase:
            return jsonify({
                "total_analyses": 0,
                "avg_resume_score": 0,
                "avg_ats_score": 0,
                "total_suggestions": 0,
                "recent_analyses": []
            }), 200

        query = supabase.table('analyses').select('id, resume_id, job_title, resume_score, ats_score, suggestions, analyzed_at, resumes(file_name, file_type, file_size)').order('analyzed_at', desc=True)
        if user_id:
            try:
                uuid.UUID(user_id)
                query = query.eq('user_id', user_id)
            except (ValueError, AttributeError):
                pass
            
        res = query.execute()
        rows = res.data or []
        
        total_analyses = len(rows)
        if total_analyses > 0:
            avg_resume_score = round(sum(r.get('resume_score', 0) for r in rows) / total_analyses)
            avg_ats_score = round(sum(r.get('ats_score', 0) for r in rows) / total_analyses)
            total_suggestions = sum(len(r.get('suggestions', [])) for r in rows if isinstance(r.get('suggestions'), list))
        else:
            avg_resume_score = 0
            avg_ats_score = 0
            total_suggestions = 0
            
        recent_analyses = []
        for r in rows[:5]:
            resume_data = r.get('resumes') or {}
            recent_analyses.append({
                "id": r.get('id'),
                "name": resume_data.get('file_name', 'Resume.pdf'),
                "type": resume_data.get('file_type', 'pdf'),
                "job_title": r.get('job_title', 'Software Engineer'),
                "date": r.get('analyzed_at', ''),
                "resumeScore": r.get('resume_score', 0),
                "atsScore": r.get('ats_score', 0),
                "status": "Completed"
            })
            
        return jsonify({
            "total_analyses": total_analyses,
            "avg_resume_score": avg_resume_score,
            "avg_ats_score": avg_ats_score,
            "total_suggestions": total_suggestions,
            "recent_analyses": recent_analyses
        }), 200
    except Exception as e:
        print(f"Error in dashboard stats: {e}")
        return jsonify({"error": str(e)}), 500

