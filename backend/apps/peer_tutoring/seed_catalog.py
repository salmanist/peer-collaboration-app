import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
django.setup()

from django.db import transaction
from apps.peer_tutoring.models import AcademicCourse, SkillTopic

COURSES_DATA = [
    # =========================================================================
    # 1. Computer Science (BS CS)
    # =========================================================================
    {"code": "CS-101", "title": "Programming Fundamentals (C/C++)", "department": "Computer Science (BS CS)"},
    {"code": "CS-102", "title": "Object Oriented Programming (OOP)", "department": "Computer Science (BS CS)"},
    {"code": "CS-201", "title": "Data Structures & Algorithms (DSA)", "department": "Computer Science (BS CS)"},
    {"code": "CS-202", "title": "Discrete Structures & Logic", "department": "Computer Science (BS CS)"},
    {"code": "CS-204", "title": "Digital Logic Design (DLD)", "department": "Computer Science (BS CS)"},
    {"code": "CS-301", "title": "Computer Organization & Assembly Language", "department": "Computer Science (BS CS)"},
    {"code": "CS-302", "title": "Database Systems & SQL", "department": "Computer Science (BS CS)"},
    {"code": "CS-304", "title": "Operating Systems & Kernel Concepts", "department": "Computer Science (BS CS)"},
    {"code": "CS-305", "title": "Design & Analysis of Algorithms", "department": "Computer Science (BS CS)"},
    {"code": "CS-306", "title": "Computer Networks & Internet Protocols", "department": "Computer Science (BS CS)"},
    {"code": "CS-401", "title": "Theory of Automata & Formal Languages", "department": "Computer Science (BS CS)"},
    {"code": "CS-402", "title": "Compiler Construction", "department": "Computer Science (BS CS)"},
    {"code": "CS-403", "title": "Artificial Intelligence Fundamentals", "department": "Computer Science (BS CS)"},
    {"code": "CS-405", "title": "Information & Cyber Security", "department": "Computer Science (BS CS)"},
    {"code": "CS-407", "title": "Parallel & Distributed Computing", "department": "Computer Science (BS CS)"},
    {"code": "CS-409", "title": "Computer Graphics & Multimedia", "department": "Computer Science (BS CS)"},

    # =========================================================================
    # 2. Software Engineering (BS SE)
    # =========================================================================
    {"code": "SE-201", "title": "Software Engineering Principles", "department": "Software Engineering (BS SE)"},
    {"code": "SE-202", "title": "Software Requirements Engineering", "department": "Software Engineering (BS SE)"},
    {"code": "SE-301", "title": "Software Design & Architecture", "department": "Software Engineering (BS SE)"},
    {"code": "SE-302", "title": "Software Quality Engineering & Assurance (SQA)", "department": "Software Engineering (BS SE)"},
    {"code": "SE-303", "title": "Software Construction & Clean Code", "department": "Software Engineering (BS SE)"},
    {"code": "SE-304", "title": "Web Engineering & Full-Stack Architecture", "department": "Software Engineering (BS SE)"},
    {"code": "SE-305", "title": "Mobile Application Development (React Native & Flutter)", "department": "Software Engineering (BS SE)"},
    {"code": "SE-401", "title": "Software Project Management (Agile/Scrum)", "department": "Software Engineering (BS SE)"},
    {"code": "SE-402", "title": "Software Testing, Verification & Validation", "department": "Software Engineering (BS SE)"},
    {"code": "SE-403", "title": "Software Re-Engineering & Refactoring", "department": "Software Engineering (BS SE)"},
    {"code": "SE-404", "title": "Formal Methods in Software Engineering", "department": "Software Engineering (BS SE)"},
    {"code": "SE-405", "title": "Software Metrics & Measurement", "department": "Software Engineering (BS SE)"},
    {"code": "SE-406", "title": "DevOps & Continuous Integration / Deployment (CI/CD)", "department": "Software Engineering (BS SE)"},
    {"code": "SE-407", "title": "Cloud-Native Application Development", "department": "Software Engineering (BS SE)"},

    # =========================================================================
    # 3. Artificial Intelligence (BS AI)
    # =========================================================================
    {"code": "AI-201", "title": "Introduction to Artificial Intelligence", "department": "Artificial Intelligence (BS AI)"},
    {"code": "AI-202", "title": "Programming for AI (Python, NumPy, Pandas)", "department": "Artificial Intelligence (BS AI)"},
    {"code": "AI-301", "title": "Machine Learning Algorithms & Models", "department": "Artificial Intelligence (BS AI)"},
    {"code": "AI-302", "title": "Knowledge Representation & Automated Reasoning", "department": "Artificial Intelligence (BS AI)"},
    {"code": "AI-303", "title": "Deep Learning & Neural Networks (PyTorch/TensorFlow)", "department": "Artificial Intelligence (BS AI)"},
    {"code": "AI-304", "title": "Natural Language Processing (NLP & LLMs)", "department": "Artificial Intelligence (BS AI)"},
    {"code": "AI-305", "title": "Computer Vision & Image Processing", "department": "Artificial Intelligence (BS AI)"},
    {"code": "AI-401", "title": "Reinforcement Learning & Game AI", "department": "Artificial Intelligence (BS AI)"},
    {"code": "AI-402", "title": "Speech & Audio Processing", "department": "Artificial Intelligence (BS AI)"},
    {"code": "AI-403", "title": "Robotics & Autonomous Systems", "department": "Artificial Intelligence (BS AI)"},
    {"code": "AI-404", "title": "Generative AI & Large Language Models", "department": "Artificial Intelligence (BS AI)"},
    {"code": "AI-405", "title": "AI Ethics, Bias & Governance", "department": "Artificial Intelligence (BS AI)"},
    {"code": "AI-406", "title": "Pattern Recognition & Classification", "department": "Artificial Intelligence (BS AI)"},

    # =========================================================================
    # 4. Data Science (BS DS)
    # =========================================================================
    {"code": "DS-201", "title": "Introduction to Data Science & Analytics", "department": "Data Science (BS DS)"},
    {"code": "DS-202", "title": "Applied Statistics & Probability for Data Science", "department": "Data Science (BS DS)"},
    {"code": "DS-301", "title": "Data Mining & Knowledge Discovery", "department": "Data Science (BS DS)"},
    {"code": "DS-302", "title": "Data Warehousing & Business Intelligence (ETL/PowerBI)", "department": "Data Science (BS DS)"},
    {"code": "DS-303", "title": "Data Visualization & Storytelling (Matplotlib/Tableau)", "department": "Data Science (BS DS)"},
    {"code": "DS-304", "title": "Big Data Technologies & Ecosystems (Hadoop/Spark)", "department": "Data Science (BS DS)"},
    {"code": "DS-305", "title": "Statistical Modeling & Regression Analysis", "department": "Data Science (BS DS)"},
    {"code": "DS-401", "title": "Time Series Forecasting & Analysis", "department": "Data Science (BS DS)"},
    {"code": "DS-402", "title": "Deep Learning for Complex Data", "department": "Data Science (BS DS)"},
    {"code": "DS-403", "title": "Text Analytics & Sentiment Mining", "department": "Data Science (BS DS)"},
    {"code": "DS-404", "title": "Data Science Capstone & Predictive Modeling", "department": "Data Science (BS DS)"},
    {"code": "DS-405", "title": "Data Governance, Security & Ethics", "department": "Data Science (BS DS)"},

    # =========================================================================
    # 5. Information Technology (BS IT)
    # =========================================================================
    {"code": "IT-201", "title": "Information Technology Infrastructure", "department": "Information Technology (BS IT)"},
    {"code": "IT-202", "title": "System & Linux Network Administration", "department": "Information Technology (BS IT)"},
    {"code": "IT-301", "title": "Database Administration & Optimization (DBA)", "department": "Information Technology (BS IT)"},
    {"code": "IT-302", "title": "Web Systems & Enterprise Services", "department": "Information Technology (BS IT)"},
    {"code": "IT-303", "title": "Cloud Computing Infrastructure (AWS / Azure)", "department": "Information Technology (BS IT)"},
    {"code": "IT-304", "title": "IT Project Management & ITIL Standards", "department": "Information Technology (BS IT)"},
    {"code": "IT-401", "title": "Network Security & Cryptographic Protocols", "department": "Information Technology (BS IT)"},
    {"code": "IT-402", "title": "Digital Forensics & Incident Response", "department": "Information Technology (BS IT)"},
    {"code": "IT-403", "title": "Enterprise Resource Planning (ERP Systems)", "department": "Information Technology (BS IT)"},
    {"code": "IT-404", "title": "Virtualization & Containerization (Docker/Kubernetes)", "department": "Information Technology (BS IT)"},
    {"code": "IT-405", "title": "Internet of Things (IoT) Architectures", "department": "Information Technology (BS IT)"},

    # =========================================================================
    # 6. Accounting & Finance (BS AF)
    # =========================================================================
    {"code": "AF-101", "title": "Principles of Financial Accounting I", "department": "Accounting & Finance (BS AF)"},
    {"code": "AF-102", "title": "Principles of Financial Accounting II", "department": "Accounting & Finance (BS AF)"},
    {"code": "AF-201", "title": "Cost & Management Accounting", "department": "Accounting & Finance (BS AF)"},
    {"code": "AF-202", "title": "Business Finance & Time Value of Money", "department": "Accounting & Finance (BS AF)"},
    {"code": "AF-301", "title": "Financial Management & Capital Budgeting", "department": "Accounting & Finance (BS AF)"},
    {"code": "AF-302", "title": "Corporate Finance & Capital Markets", "department": "Accounting & Finance (BS AF)"},
    {"code": "AF-303", "title": "Financial Reporting & IFRS Standards", "department": "Accounting & Finance (BS AF)"},
    {"code": "AF-304", "title": "Auditing & Assurance Principles", "department": "Accounting & Finance (BS AF)"},
    {"code": "AF-305", "title": "Business Taxation & Income Tax Laws (FBR)", "department": "Accounting & Finance (BS AF)"},
    {"code": "AF-306", "title": "Sales Tax & Corporate Legal Compliance", "department": "Accounting & Finance (BS AF)"},
    {"code": "AF-401", "title": "Investment Analysis & Portfolio Management", "department": "Accounting & Finance (BS AF)"},
    {"code": "AF-402", "title": "Financial Derivatives & Risk Management", "department": "Accounting & Finance (BS AF)"},
    {"code": "AF-403", "title": "Financial Econometrics & Time Series", "department": "Accounting & Finance (BS AF)"},
    {"code": "AF-404", "title": "Islamic Banking, Finance & Takaful", "department": "Accounting & Finance (BS AF)"},
    {"code": "AF-405", "title": "International Financial Management (Forex)", "department": "Accounting & Finance (BS AF)"},
    {"code": "AF-406", "title": "Financial Modeling & Valuation (Excel)", "department": "Accounting & Finance (BS AF)"},
    {"code": "AF-407", "title": "Corporate Governance & Business Ethics", "department": "Accounting & Finance (BS AF)"},
    {"code": "AF-408", "title": "Accounting Information Systems (QuickBooks/SAP)", "department": "Accounting & Finance (BS AF)"},

    # =========================================================================
    # 7. Business Administration (BBA)
    # =========================================================================
    {"code": "MGT-101", "title": "Principles of Management & Organization", "department": "Business Administration (BBA)"},
    {"code": "MKT-101", "title": "Principles of Marketing Fundamentals", "department": "Business Administration (BBA)"},
    {"code": "ECO-101", "title": "Microeconomics for Business", "department": "Business Administration (BBA)"},
    {"code": "ECO-102", "title": "Macroeconomics & National Economy", "department": "Business Administration (BBA)"},
    {"code": "HRM-201", "title": "Human Resource Management (HRM)", "department": "Business Administration (BBA)"},
    {"code": "MGT-202", "title": "Organizational Behavior & Dynamics", "department": "Business Administration (BBA)"},
    {"code": "MKT-202", "title": "Consumer Behavior & Market Research", "department": "Business Administration (BBA)"},
    {"code": "MKT-301", "title": "Digital Marketing & Social Media Strategy", "department": "Business Administration (BBA)"},
    {"code": "SCM-301", "title": "Supply Chain & Logistics Management", "department": "Business Administration (BBA)"},
    {"code": "MGT-302", "title": "Operations & Production Management", "department": "Business Administration (BBA)"},
    {"code": "LAW-301", "title": "Business & Mercantile Law", "department": "Business Administration (BBA)"},
    {"code": "MGT-401", "title": "Strategic Management & Business Policy", "department": "Business Administration (BBA)"},
    {"code": "ENT-401", "title": "Entrepreneurship, Startups & Innovation", "department": "Business Administration (BBA)"},
    {"code": "MKT-402", "title": "Brand Management & Advertising Strategy", "department": "Business Administration (BBA)"},
    {"code": "HRM-401", "title": "Training, Development & Talent Acquisition", "department": "Business Administration (BBA)"},
    {"code": "MGT-405", "title": "Corporate Social Responsibility (CSR) & Ethics", "department": "Business Administration (BBA)"},

    # =========================================================================
    # 8. Biotechnology & Life Sciences
    # =========================================================================
    {"code": "BIO-101", "title": "Cell Biology & Ultrastructure", "department": "Biotechnology & Life Sciences"},
    {"code": "BIO-102", "title": "General Microbiology & Microbial Techniques", "department": "Biotechnology & Life Sciences"},
    {"code": "BIO-201", "title": "Principles of Classical & Modern Genetics", "department": "Biotechnology & Life Sciences"},
    {"code": "BIO-202", "title": "Biochemistry I: Biomolecules & Metabolism", "department": "Biotechnology & Life Sciences"},
    {"code": "BIO-203", "title": "Biochemistry II: Enzymology & Bioenergetics", "department": "Biotechnology & Life Sciences"},
    {"code": "BIO-301", "title": "Molecular Biology & Nucleic Acid Biochemistry", "department": "Biotechnology & Life Sciences"},
    {"code": "BIO-302", "title": "Recombinant DNA Technology & Genetic Engineering", "department": "Biotechnology & Life Sciences"},
    {"code": "BIO-303", "title": "Bioinformatics & Computational Biology", "department": "Biotechnology & Life Sciences"},
    {"code": "BIO-304", "title": "Immunology & Immunotechnology", "department": "Biotechnology & Life Sciences"},
    {"code": "BIO-305", "title": "Bioprocess Engineering & Fermentation Tech", "department": "Biotechnology & Life Sciences"},
    {"code": "BIO-401", "title": "Plant Tissue Culture & Agricultural Biotech", "department": "Biotechnology & Life Sciences"},
    {"code": "BIO-402", "title": "Medical & Pharmaceutical Biotechnology", "department": "Biotechnology & Life Sciences"},
    {"code": "BIO-403", "title": "Environmental Biotechnology & Bioremediation", "department": "Biotechnology & Life Sciences"},
    {"code": "BIO-404", "title": "Genomics, Proteomics & Metabolomics", "department": "Biotechnology & Life Sciences"},
    {"code": "BIO-405", "title": "Biosafety, Bioethics & Research Regulatory Standards", "department": "Biotechnology & Life Sciences"},
    {"code": "BIO-406", "title": "Biostatistics & Experimental Design (SPSS)", "department": "Biotechnology & Life Sciences"},

    # =========================================================================
    # 9. Islamic Studies
    # =========================================================================
    {"code": "ISL-101", "title": "Islamic Jurisprudence (Fiqh I: Taharah & Salah)", "department": "Islamic Studies"},
    {"code": "ISL-102", "title": "Principles of Islamic Jurisprudence (Usul-ul-Fiqh)", "department": "Islamic Studies"},
    {"code": "ISL-201", "title": "Quranic Exegesis (Tafseer of Selected Surahs)", "department": "Islamic Studies"},
    {"code": "ISL-202", "title": "Sciences of the Quran (Uloom-ul-Quran)", "department": "Islamic Studies"},
    {"code": "ISL-203", "title": "Study of Hadith Texts (Sahih Bukhari & Muslim)", "department": "Islamic Studies"},
    {"code": "ISL-204", "title": "Sciences of Hadith & Takhrij (Uloom-ul-Hadith)", "department": "Islamic Studies"},
    {"code": "ISL-301", "title": "Islamic History & The Rightly Guided Caliphate", "department": "Islamic Studies"},
    {"code": "ISL-302", "title": "Seerat-un-Nabi (PBUH) & Character Building", "department": "Islamic Studies"},
    {"code": "ISL-303", "title": "Islamic Economic & Financial System", "department": "Islamic Studies"},
    {"code": "ISL-304", "title": "Comparative Religions & Modern Ideologies", "department": "Islamic Studies"},
    {"code": "ISL-401", "title": "Arabic Grammar: Morphology & Syntax (Nahw & Sarf I)", "department": "Islamic Studies"},
    {"code": "ISL-402", "title": "Arabic Grammar & Textual Translation (Nahw & Sarf II)", "department": "Islamic Studies"},
    {"code": "ISL-403", "title": "Dawah, Public Speaking & Methodology of Preaching", "department": "Islamic Studies"},
    {"code": "ISL-404", "title": "Research Methodology & Thesis Writing in Islamic Studies", "department": "Islamic Studies"},
    {"code": "ISL-405", "title": "Muslim Political & Constitutional Thought", "department": "Islamic Studies"},

    # =========================================================================
    # 10. Mathematics & Statistics
    # =========================================================================
    {"code": "MATH-101", "title": "Calculus I: Single Variable Calculus", "department": "Mathematics & Statistics"},
    {"code": "MATH-102", "title": "Calculus II: Multivariable Calculus", "department": "Mathematics & Statistics"},
    {"code": "MATH-201", "title": "Linear Algebra & Matrix Theory", "department": "Mathematics & Statistics"},
    {"code": "MATH-202", "title": "Differential Equations & Dynamical Systems", "department": "Mathematics & Statistics"},
    {"code": "MATH-203", "title": "Discrete Mathematics & Graph Theory", "department": "Mathematics & Statistics"},
    {"code": "MATH-301", "title": "Numerical Analysis & Computation", "department": "Mathematics & Statistics"},
    {"code": "MATH-302", "title": "Complex Analysis & Conformal Mapping", "department": "Mathematics & Statistics"},
    {"code": "STAT-101", "title": "Introduction to Probability & Descriptive Statistics", "department": "Mathematics & Statistics"},
    {"code": "STAT-201", "title": "Statistical Inference & Hypothesis Testing", "department": "Mathematics & Statistics"},
    {"code": "STAT-301", "title": "Regression Analysis & Econometric Models", "department": "Mathematics & Statistics"},
    {"code": "STAT-302", "title": "Applied Probability & Stochastic Processes", "department": "Mathematics & Statistics"},
    {"code": "PHY-101", "title": "Applied Physics & Electromagnetism", "department": "Mathematics & Statistics"},

    # =========================================================================
    # 11. Humanities & Social Sciences
    # =========================================================================
    {"code": "ENG-101", "title": "Functional English & Grammar Essentials", "department": "Humanities & Social Sciences"},
    {"code": "ENG-102", "title": "English Composition & Comprehension", "department": "Humanities & Social Sciences"},
    {"code": "ENG-201", "title": "Technical & Professional Report Writing", "department": "Humanities & Social Sciences"},
    {"code": "ENG-301", "title": "Academic Research Writing & Critical Thinking", "department": "Humanities & Social Sciences"},
    {"code": "PAK-101", "title": "Pakistan Studies & Constitutional History", "department": "Humanities & Social Sciences"},
    {"code": "PSY-101", "title": "General Psychology & Human Behavior", "department": "Humanities & Social Sciences"},
    {"code": "SOC-101", "title": "Introduction to Sociology & Community Dynamics", "department": "Humanities & Social Sciences"},
    {"code": "IR-101", "title": "Introduction to International Relations (IR)", "department": "Humanities & Social Sciences"},
    {"code": "MCM-101", "title": "Mass Communication & Media Studies", "department": "Humanities & Social Sciences"},
    {"code": "ETH-101", "title": "Professional Ethics, Values & Social Responsibility", "department": "Humanities & Social Sciences"},
]

SKILLS_DATA = [
    # Programming & Tech
    {"name": "Python Programming", "category": "Programming & Tech"},
    {"name": "C++ & Object Oriented Design", "category": "Programming & Tech"},
    {"name": "Java & Enterprise Architecture", "category": "Programming & Tech"},
    {"name": "JavaScript / TypeScript", "category": "Programming & Tech"},
    {"name": "React & Next.js Frontend", "category": "Programming & Tech"},
    {"name": "React Native & Flutter Mobile Apps", "category": "Programming & Tech"},
    {"name": "Django & FastAPI Python Backend", "category": "Programming & Tech"},
    {"name": "Node.js & Express APIs", "category": "Programming & Tech"},
    {"name": "SQL & Relational Database Design", "category": "Programming & Tech"},
    {"name": "Git & GitHub Version Control", "category": "Programming & Tech"},
    {"name": "Docker & Containerization", "category": "Programming & Tech"},
    {"name": "AWS & Cloud Infrastructure", "category": "Programming & Tech"},

    # Artificial Intelligence & Data Science
    {"name": "Machine Learning (Scikit-Learn)", "category": "AI & Data Science"},
    {"name": "Deep Learning (PyTorch / TensorFlow)", "category": "AI & Data Science"},
    {"name": "Natural Language Processing (NLP & LLMs)", "category": "AI & Data Science"},
    {"name": "Computer Vision (OpenCV)", "category": "AI & Data Science"},
    {"name": "Data Analysis (Pandas, NumPy)", "category": "AI & Data Science"},
    {"name": "Data Visualization (Tableau, PowerBI)", "category": "AI & Data Science"},
    {"name": "Big Data (Apache Spark, PySpark)", "category": "AI & Data Science"},

    # Accounting, Finance & Business Tools
    {"name": "Financial Modeling & Valuation in Excel", "category": "Accounting & Finance"},
    {"name": "QuickBooks & Xero Accounting", "category": "Accounting & Finance"},
    {"name": "Taxation Filing & FBR Compliance", "category": "Accounting & Finance"},
    {"name": "Auditing Working Papers & Vouching", "category": "Accounting & Finance"},
    {"name": "Corporate Financial Statement Analysis", "category": "Accounting & Finance"},
    {"name": "Stock Market & Portfolio Analysis", "category": "Accounting & Finance"},
    {"name": "Islamic Banking & Takaful Structuring", "category": "Accounting & Finance"},

    # Biotechnology & Lab Sciences
    {"name": "PCR & Gel Electrophoresis Protocols", "category": "Biotechnology & Sciences"},
    {"name": "Bioinformatics Tools (NCBI, BLAST, PyMOL)", "category": "Biotechnology & Sciences"},
    {"name": "SPSS Statistical Data Analysis", "category": "Biotechnology & Sciences"},
    {"name": "Microbiological Staining & Culturing", "category": "Biotechnology & Sciences"},
    {"name": "DNA / RNA Extraction & Quantification", "category": "Biotechnology & Sciences"},
    {"name": "Scientific Paper Writing & Citations", "category": "Biotechnology & Sciences"},

    # Islamic Studies & Languages
    {"name": "Arabic Grammar & Translation (Nahw & Sarf)", "category": "Islamic Studies & Arabic"},
    {"name": "Quranic Tajweed & Recitation", "category": "Islamic Studies & Arabic"},
    {"name": "Hadith Takhrij & Sanad Verification", "category": "Islamic Studies & Arabic"},
    {"name": "Islamic Fiqh Research & Fatwa Analysis", "category": "Islamic Studies & Arabic"},
    {"name": "Islamic Public Speaking & Khutbah Preparation", "category": "Islamic Studies & Arabic"},

    # Design & Creative Tools
    {"name": "UI/UX Design with Figma", "category": "Design & Creative"},
    {"name": "Graphic Design (Adobe Photoshop / Illustrator)", "category": "Design & Creative"},
    {"name": "Canva Presentation & Social Media Design", "category": "Design & Creative"},
    {"name": "Video Editing (Premiere Pro / CapCut)", "category": "Design & Creative"},

    # Soft Skills, Management & Career Guidance
    {"name": "Communication & Interpersonal Skills", "category": "Soft Skills & Career"},
    {"name": "Public Speaking & Stage Presence", "category": "Soft Skills & Career"},
    {"name": "Resume / CV Writing & ATS Optimization", "category": "Soft Skills & Career"},
    {"name": "Technical & HR Interview Preparation", "category": "Soft Skills & Career"},
    {"name": "Time Management & Exam Study Strategy", "category": "Soft Skills & Career"},
    {"name": "Digital Marketing & Brand Strategy", "category": "Soft Skills & Career"},
]

def seed_catalog():
    with transaction.atomic():
        # Clear existing catalog to re-seed clean updated set
        AcademicCourse.objects.all().delete()
        SkillTopic.objects.all().delete()

        course_objs = [
            AcademicCourse(
                code=item["code"],
                title=item["title"],
                department=item["department"],
                is_active=True,
            )
            for item in COURSES_DATA
        ]
        AcademicCourse.objects.bulk_create(course_objs)

        skill_objs = [
            SkillTopic(
                name=item["name"],
                category=item["category"],
                is_active=True,
            )
            for item in SKILLS_DATA
        ]
        SkillTopic.objects.bulk_create(skill_objs)

    print(f"Catalog Seed Complete! Total Courses: {AcademicCourse.objects.count()}, Total Skills: {SkillTopic.objects.count()}")

if __name__ == "__main__":
    seed_catalog()
