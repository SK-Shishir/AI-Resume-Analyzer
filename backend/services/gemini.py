import os
import json
import re
from dotenv import load_dotenv
from google import genai

# Find and load .env from backend directory or project root
backend_env = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(backend_env):
    load_dotenv(backend_env)
else:
    load_dotenv()

# Fallback skills in case Gemini key is not configured or network error occurs
DEFAULT_JOB_PROFILES = {
    "software engineer": ["Python", "Java", "Data Structures", "Algorithms", "Git", "SQL", "OOP", "REST APIs", "Unit Testing", "Problem Solving"],
    "frontend developer": ["JavaScript", "React", "HTML5", "CSS3", "TypeScript", "Tailwind CSS", "Redux", "Git", "REST APIs", "Responsive Design"],
    "backend developer": ["Python", "Flask", "Node.js", "Django", "PostgreSQL", "MongoDB", "REST APIs", "Docker", "Authentication", "Git"],
    "full stack developer": ["React", "Node.js", "Python", "SQL", "Git", "JavaScript", "HTML/CSS", "REST APIs", "Docker", "Cloud Basics"],
    "data analyst": ["Python", "SQL", "Pandas", "Power BI", "Excel", "Data Visualization", "Statistics", "Tableau", "Data Cleaning"],
    "ui/ux designer": ["Figma", "User Research", "Wireframing", "Prototyping", "Design Systems", "Usability Testing", "Adobe XD", "Information Architecture"]
}

def get_gemini_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or api_key.startswith("YOUR_"):
        return None
    try:
        return genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Error creating Gemini client: {e}")
        return None

def call_gemini(client, prompt: str) -> str:
    """Try primary model with fast fallback to flash-lite if busy."""
    models_to_try = ['gemini-3.5-flash', 'gemini-3.5-flash-lite']
    last_err = None
    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            if response and response.text:
                return response.text.strip()
        except Exception as e:
            last_err = e
            print(f"Gemini call to {model_name} failed: {e}. Trying next fallback...")
    raise last_err or RuntimeError("Gemini model execution failed")

def fetch_job_requirements(job_title: str, company_name: str = "", job_description: str = "") -> dict:
    """
    Fetches required skills and experience standards for a target job role and specific company via Gemini AI.
    Optionally extracts exact requirements from a pasted Job Description (JD) circular.
    """
    client = get_gemini_client()
    
    company_context = f' at "{company_name}"' if company_name else ""
    company_focus = f'Focus specifically on what "{company_name}" looks for in candidates (their industry standards, tech stack, and hiring culture).' if company_name else ""
    jd_context = f"""
The candidate has provided the following EXACT Job Description (JD) / Circular text:
\"\"\"
{job_description[:3500]}
\"\"\"
Carefully analyze this job circular line-by-line. Extract the exact technical skills, tools, required competencies, qualification levels, and key responsibilities listed in this circular.
""" if job_description else ""

    if client:
        has_jd_str = "true" if job_description else "false"
        prompt = f"""
You are an expert technical recruiter and corporate hiring manager.
For the job role: "{job_title}"{company_context}, provide the key technical, domain, and professional requirements that recruiters look for in candidates. {company_focus}
{jd_context}

Return ONLY a valid JSON object with the following structure:
{{
    "job_title": "{job_title}",
    "company_name": "{company_name}",
    "has_job_description": {has_jd_str},
    "required_skills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5", "Skill 6", "Skill 7", "Skill 8"],
    "experience_level": "Brief overview of expected experience (e.g. 0-2 years, projects, internship expectations)",
    "key_responsibilities": [
        "Responsibility 1",
        "Responsibility 2",
        "Responsibility 3"
    ]
}}
Do not include markdown code block formatting (no ```json). Just the raw JSON string.
"""
        try:
            text = call_gemini(client, prompt)
            # Clean possible markdown ticks
            text = re.sub(r'^```json\s*', '', text)
            text = re.sub(r'^```\s*', '', text)
            text = re.sub(r'```$', '', text).strip()
            data = json.loads(text)
            if "required_skills" in data and isinstance(data["required_skills"], list):
                if company_name:
                    data["company_name"] = company_name
                if job_description:
                    data["has_job_description"] = True
                return data
        except Exception as e:
            print(f"Gemini API error for job requirements: {e}")

    # Fallback if Gemini is not configured or error occurs
    job_lower = job_title.lower()
    matched_key = next((k for k in DEFAULT_JOB_PROFILES if k in job_lower), "software engineer")
    skills = list(DEFAULT_JOB_PROFILES[matched_key])
    
    if company_name:
        comp_lower = company_name.lower()
        if "bank" in comp_lower or "finance" in comp_lower or "fintech" in comp_lower or "bkash" in comp_lower:
            skills = skills[:6] + ["Financial Data Security", "Regulatory Compliance", "Transaction Integrity", "Risk Analysis"]

    return {
        "job_title": job_title,
        "company_name": company_name,
        "has_job_description": bool(job_description),
        "required_skills": skills,
        "experience_level": f"Entry to Mid Level (0-3 years) tailored for {company_name if company_name else job_title}",
        "key_responsibilities": [
            f"Build and maintain scalable solutions relevant to {job_title}{f' at {company_name}' if company_name else ''}.",
            "Collaborate with cross-functional teams to deliver secure, high-impact features.",
            "Maintain compliance, clean code standards, and rigorous quality assurance."
        ]
    }

def generate_improved_resume(raw_cv_text: str, target_job: str, missing_skills: list, suggestions: list, company_name: str = "", job_description: str = "") -> str:
    """
    Uses Gemini AI to rewrite and enhance the candidate's CV with recommended keywords, phrasing, company targeting, and JD circular matching.
    """
    client = get_gemini_client()
    
    company_instruction = f"""5. Company Alignment: Tailor the Professional Summary and achievements specifically for "{company_name}", referencing their domain standards (e.g. banking, telecom, or enterprise technology).""" if company_name else ""
    jd_instruction = f"""6. Job Description (JD) Circular Alignment:
The candidate provided the following target Job Circular / Description:
\"\"\"
{job_description[:3000]}
\"\"\"
Align the improved CV bullet points, work experience highlights, and projects to directly address the core requirements, responsibilities, and terminology requested in this JD.""" if job_description else ""

    if client:
        prompt = f"""
You are a top-tier executive resume writer and career coach.
A candidate has provided their current resume for the target job role: "{target_job}"{f' at {company_name}' if company_name else ''}.

Based on the resume content and our gap analysis:
- Target Role: {target_job}
- Target Company: {company_name if company_name else 'General Industry'}
- Missing Key Skills for this role: {', '.join(missing_skills) if missing_skills else 'None identified'}
- Suggestions for improvement: {'; '.join(suggestions)}

Please provide a professionally reconstructed, ATS-optimized version of this resume.
1. Add a compelling Professional Summary tailored to {target_job}{f' at {company_name}' if company_name else ''}.
2. Reorganize the Skills section to include both existing and relevant missing skills where suitable.
3. Enhance the Experience & Projects section with strong action verbs and quantified achievements.
4. Keep the output clean, structured, and ready to copy/paste.
{company_instruction}
{jd_instruction}

Candidate's Current Resume Content:
{raw_cv_text[:3500]}
"""
        try:
            return call_gemini(client, prompt)
        except Exception as e:
            print(f"Gemini error generating improved CV: {e}")

    # Fallback template if Gemini is not configured
    header_title = f"{company_name.upper()} — {target_job.upper()}" if company_name else target_job.upper()
    return f"""==================================================
ENHANCED RESUME DRAFT FOR: {header_title}
==================================================

[PROFESSIONAL SUMMARY]
Dedicated and results-oriented professional with hands-on experience in modern technology stacks. Proven ability in developing reliable, secure solutions, problem-solving, and collaborating across development lifecycles. Aiming to leverage technical expertise for the {target_job} position{f' at {company_name}' if company_name else ''}.

[TECHNICAL SKILLS]
• Core Competencies: {', '.join(missing_skills[:4]) if missing_skills else 'Software Engineering, Problem Solving'}
• Tools & Platforms: Git, RESTful APIs, Relational Databases, Cloud Basics
• Methodologies: Agile / Scrum, Clean Code, CI/CD, Enterprise Standards

[KEY RECOMMENDATIONS IMPLEMENTED]
{chr(10).join(['• ' + s for s in suggestions[:4]])}

[ORIGINAL EXTRACTED DETAILS ENHANCED]
{raw_cv_text[:1200]}
"""
