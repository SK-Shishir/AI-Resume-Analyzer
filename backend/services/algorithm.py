import re

ACTION_VERBS = {
    'developed', 'designed', 'built', 'created', 'implemented', 'managed',
    'led', 'engineered', 'architected', 'optimized', 'improved', 'increased',
    'decreased', 'resolved', 'analyzed', 'collaborated', 'delivered', 'launched',
    'deployed', 'automated', 'integrated', 'spearheaded', 'established', 'conducted'
}

STANDARD_SECTIONS = {
    'contact': [r'email', r'phone', r'contact', r'linkedin', r'github', r'portfolio'],
    'education': [r'education', r'academic', r'degree', r'university', r'college', r'bachelor', r'master'],
    'experience': [r'experience', r'work history', r'employment', r'internship', r'professional experience'],
    'skills': [r'skills', r'technical skills', r'technologies', r'competencies', r'tools'],
    'projects': [r'projects', r'personal projects', r'academic projects']
}

def analyze_resume_text(raw_text: str, target_job: str, required_skills: list) -> dict:
    """
    Algorithmic evaluation of resume text against target job requirements.
    No AI is used in this scoring process; pure deterministic logic.
    """
    text_lower = raw_text.lower()
    words = re.findall(r'\b[a-zA-Z0-9\+\#\.]+\b', text_lower)
    word_count = len(words)
    
    # ── 1. SECTION & STRUCTURE ANALYSIS (ATS) ──
    sections_found = {}
    for section, patterns in STANDARD_SECTIONS.items():
        found = any(re.search(r'\b' + pat + r'\b', text_lower) for pat in patterns)
        sections_found[section] = found
        
    section_score = (sum(sections_found.values()) / len(STANDARD_SECTIONS)) * 100

    # ── 2. ACTION VERBS COUNT ──
    found_verbs = [v for v in ACTION_VERBS if re.search(r'\b' + v + r'\b', text_lower)]
    verb_score = min(100, (len(found_verbs) / 7) * 100)

    # ── 3. QUANTIFIABLE METRICS (Numbers, percentages, $ signs) ──
    metric_matches = re.findall(r'(\d+[\%kK\+]?|\$\d+)', raw_text)
    metric_score = min(100, (len(metric_matches) / 5) * 100)

    # ── 4. ATS OVERALL SCORE ──
    # Weighted ATS: Sections 40%, Action Verbs 30%, Metrics 30%
    ats_score = int((section_score * 0.40) + (verb_score * 0.30) + (metric_score * 0.30))
    ats_score = max(20, min(100, ats_score))

    # ── 5. SKILL MATCHING & GAP ANALYSIS ──
    matched_skills = []
    missing_skills = []
    
    for skill in required_skills:
        # Match as whole word/phrase
        escaped_skill = re.escape(skill.lower())
        if re.search(r'(?:\b|\W)' + escaped_skill + r'(?:\b|\W)', text_lower):
            matched_skills.append(skill)
        else:
            missing_skills.append(skill)
            
    total_req = len(required_skills)
    if total_req > 0:
        match_score = int((len(matched_skills) / total_req) * 100)
    else:
        match_score = 50
    match_score = max(10, min(100, match_score))

    # ── 6. CONTENT QUALITY SCORE ──
    # Optimal length: 300 to 1000 words
    if word_count < 150:
        content_score = 35
    elif word_count < 300:
        content_score = 60
    elif 300 <= word_count <= 950:
        content_score = 88
    else:
        content_score = 75

    # ── 7. OVERALL RESUME SCORE ──
    # Overall = Match 45%, ATS 35%, Content 20%
    overall_score = int((match_score * 0.45) + (ats_score * 0.35) + (content_score * 0.20))
    overall_score = max(15, min(100, overall_score))

    # ── 8. SUGGESTIONS & STRENGTHS ──
    strengths = []
    suggestions = []

    if sections_found.get('contact'):
        strengths.append("Contact details and profiles are present.")
    else:
        suggestions.append("Add clear contact information (Email, Phone, LinkedIn, GitHub).")

    if sections_found.get('skills'):
        strengths.append("Dedicated skills section is identified.")
    else:
        suggestions.append("Create a dedicated Technical Skills section for better ATS keyword scanning.")

    if len(found_verbs) >= 5:
        strengths.append(f"Strong action verbs used ({len(found_verbs)} found: {', '.join(found_verbs[:4])}).")
    else:
        suggestions.append("Begin project bullet points with active power verbs (e.g. Developed, Led, Architected).")

    if len(metric_matches) >= 3:
        strengths.append("Measurable achievements with metrics/numbers included.")
    else:
        suggestions.append("Add measurable outcomes (e.g. 'improved performance by 25%', 'handled 50+ users').")

    if missing_skills:
        suggestions.append(f"Consider acquiring or highlighting missing job skills: {', '.join(missing_skills[:5])}.")

    return {
        "resume_score": overall_score,
        "ats_score": ats_score,
        "match_score": match_score,
        "content_score": content_score,
        "word_count": word_count,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "strengths": strengths,
        "suggestions": suggestions
    }
