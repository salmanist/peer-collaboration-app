import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
django.setup()

from django.db import transaction
from common.models import Department
from peer_tutoring.models import AcademicCourse

DEPARTMENT_COURSES = {
    # 1. Department of Computer Science (CS)
    "CS": [
        ("CS-101", "Introduction to Information & Communication Technologies", "Basic computer literacy, software concepts, Internet and networking fundamentals."),
        ("CS-102", "Programming Fundamentals (C++)", "Variables, control structures, functions, arrays, pointers, and structured programming in C++."),
        ("CS-201", "Object Oriented Programming (OOP)", "Classes, objects, inheritance, polymorphism, encapsulation, operator overloading, and templates."),
        ("CS-202", "Data Structures & Algorithms (DSA)", "Linked lists, stacks, queues, trees, graphs, sorting, searching, and algorithmic complexity."),
        ("CS-203", "Discrete Structures & Mathematics", "Sets, propositional logic, relations, functions, graph theory, trees, and combinatorics."),
        ("CS-301", "Database Systems (RDBMS & SQL)", "ER modeling, relational schema, SQL queries, normalization, indexing, transactions, and ACID properties."),
        ("CS-302", "Operating Systems", "Process management, CPU scheduling, synchronization, deadlocks, memory management, virtual memory, and file systems."),
        ("CS-303", "Computer Architecture & Assembly Language", "Microprocessor architecture, instruction set, register organization, assembly programming, and I/O interfacing."),
        ("CS-304", "Theory of Automata & Formal Languages", "Regular expressions, finite automata, context-free grammars, pushdown automata, and Turing machines."),
        ("CS-305", "Computer Networks & Data Communication", "OSI & TCP/IP models, routing protocols, IP addressing, transport layer, socket programming, and network security."),
        ("CS-401", "Software Engineering Principles", "SDLC models, Agile/Scrum methodologies, requirements engineering, UML modeling, testing, and maintenance."),
        ("CS-402", "Design & Analysis of Algorithms", "Divide and conquer, dynamic programming, greedy algorithms, backtracking, NP-completeness, and graph algorithms."),
        ("CS-403", "Web Engineering & Full Stack Development", "HTML5, CSS3, JavaScript, TypeScript, React, Node.js, REST APIs, and modern web architectures."),
        ("CS-404", "Mobile Application Development", "Cross-platform mobile apps with React Native, Flutter, state management, mobile UI/UX, and native API integration."),
        ("CS-405", "Cloud Computing & Distributed Systems", "Virtualization, Docker containers, Kubernetes, AWS/Azure cloud architecture, microservices, and serverless computing."),
        ("CS-499", "Final Year Capstone Project (FYP)", "Comprehensive research and development of an industry-grade software application."),
    ],

    # 2. Department of English (ENG)
    "ENG": [
        ("ENG-101", "English Composition & Functional Grammar", "Sentence structure, essay writing, reading comprehension, and academic vocabulary."),
        ("ENG-102", "Communication & Presentation Skills", "Verbal and non-verbal communication, public speaking, rhetoric, and group presentations."),
        ("ENG-201", "Technical & Business Writing", "Professional correspondence, project proposals, technical reports, memorandums, and documentation."),
        ("ENG-202", "Introduction to English Literature", "Survey of English prose, poetry, and drama from Elizabethan to contemporary eras."),
        ("ENG-301", "Classical Poetry & Drama", "In-depth study of Shakespeare, Milton, Chaucer, Marlowe, and Renaissance theater."),
        ("ENG-302", "Modern Fiction & 20th Century Prose", "Victorian novels, post-colonial literature, modernist fiction, and literary critiques."),
        ("ENG-303", "Introduction to Linguistics & Phonetics", "Phonology, morphology, syntax, semantics, pragmatics, and language acquisition mechanisms."),
        ("ENG-401", "Academic Research & Critical Discourse", "Literary theory, critical discourse analysis, research methodology, and thesis writing."),
        ("ENG-402", "English for Specific Purposes (ESP)", "Specialized language proficiency for legal, scientific, medical, and corporate domains."),
    ],

    # 3. Department of Artificial Intelligence (AI)
    "AI": [
        ("AI-201", "Introduction to Artificial Intelligence", "Search algorithms (A*, minimax), constraint satisfaction, knowledge representation, and expert systems."),
        ("AI-202", "Python for AI & Data Science", "NumPy, Pandas, Matplotlib, SciPy, data cleaning, statistical modeling, and data pipelines."),
        ("AI-301", "Machine Learning Fundamentals", "Supervised learning, unsupervised clustering, regression, decision trees, SVM, and model evaluation."),
        ("AI-302", "Deep Learning & Neural Networks", "Backpropagation, CNNs, RNNs, LSTMs, Transformers, PyTorch, and TensorFlow."),
        ("AI-303", "Natural Language Processing (NLP & LLMs)", "Tokenization, word embeddings, sequence-to-sequence models, BERT, GPT, and Prompt Engineering."),
        ("AI-401", "Computer Vision & Image Processing", "Image filtering, edge detection, feature extraction, object detection (YOLO), and OpenCV."),
        ("AI-402", "Reinforcement Learning & Autonomous Agents", "Markov Decision Processes, Q-learning, policy gradients, deep Q-networks, and game AI."),
        ("AI-403", "Knowledge Representation & Reasoning", "Ontologies, semantic web, description logics, automated theorem proving, and logic programming."),
        ("AI-404", "AI Ethics, Governance & Explainability (XAI)", "Bias mitigation, algorithmic fairness, model interpretability, and AI safety frameworks."),
    ],

    # 4. Department of Cyber Security (CYS)
    "CYS": [
        ("CYS-201", "Fundamentals of Information Security", "CIA triad, threat modeling, vulnerability assessment, authentication, and security policies."),
        ("CYS-202", "Applied Cryptography & Protocols", "Symmetric and asymmetric encryption, AES, RSA, ECC, hashing, digital signatures, and TLS/SSL."),
        ("CYS-301", "Ethical Hacking & Penetration Testing", "Reconnaissance, scanning, exploitation, Metasploit, Kali Linux, privilege escalation, and reporting."),
        ("CYS-302", "Digital Forensics & Incident Response", "Disk forensics, memory analysis, log examination, chain of custody, and incident handling."),
        ("CYS-303", "Web Application Security & OWASP Top 10", "SQL injection, XSS, CSRF, SSRF, security headers, and automated vulnerability scanning."),
        ("CYS-401", "Secure Software Development & DevSecOps", "Secure coding standards, static/dynamic code analysis (SAST/DAST), and CI/CD security."),
        ("CYS-402", "Malware Analysis & Reverse Engineering", "Static and dynamic analysis, disassembly with Ghidra/x64dbg, sandboxing, and behavior monitoring."),
        ("CYS-403", "Cyber Laws, Compliance & Risk Management", "PECA laws, ISO 27001, NIST cybersecurity framework, GDPR compliance, and enterprise risk management."),
    ],

    # 5. Faculty of Social Sciences (FSS)
    "FSS": [
        ("FSS-101", "Introduction to Sociology", "Social institutions, cultural dynamics, socialization, stratification, and social change."),
        ("FSS-102", "Introduction to Political Science", "State systems, forms of government, political ideologies, democracy, and sovereignty."),
        ("FSS-201", "Social Research Methods & SPSS", "Quantitative and qualitative research design, sampling, surveys, and statistical data analysis in SPSS."),
        ("FSS-202", "International Relations & Global Affairs", "Theories of IR, diplomacy, foreign policy analysis, global power dynamics, and international organizations."),
        ("FSS-301", "Gender Studies & Social Development", "Gender concepts, feminist theories, social policies, and human development indices."),
        ("FSS-302", "Public Administration & Governance", "Administrative structures, public policy making, civil services, bureaucracy, and good governance."),
        ("FSS-401", "Peace, Conflict & Strategic Studies", "Conflict analysis, mediation, peacebuilding, disarmament, and regional security paradigms."),
    ],

    # 6. Department of Psychology (PSY)
    "PSY": [
        ("PSY-101", "Introduction to Psychology", "History of psychology, sensation, perception, learning, memory, motivation, and emotion."),
        ("PSY-102", "Developmental Psychology", "Lifespan human development, cognitive development, emotional growth, and aging psychology."),
        ("PSY-201", "Theories of Personality", "Psychoanalytic, humanistic, trait, behavioral, and cognitive theories of personality."),
        ("PSY-202", "Social Psychology", "Attitudes, group dynamics, conformity, prejudice, interpersonal attraction, and social cognition."),
        ("PSY-301", "Abnormal Psychology & Psychopathology", "Diagnostic criteria (DSM-5), mood disorders, anxiety, schizophrenia, and personality disorders."),
        ("PSY-302", "Clinical Psychology & Psychotherapy", "Therapeutic modalities, cognitive behavioral therapy (CBT), client counseling, and ethical clinical practice."),
        ("PSY-303", "Experimental Psychology & Laboratory Testing", "Psychological experiments, sensory thresholds, reaction time, memory retention, and lab instrumentation."),
        ("PSY-401", "Cognitive Psychology & Neuropsychology", "Brain structures, neural processing, problem solving, decision making, and cognitive mapping."),
        ("PSY-402", "Psychological Assessment & Psychometrics", "Standardized test administration, IQ testing, personality inventories, reliability, and validity."),
    ],

    # 7. Department of Management Sciences (MGT)
    "MGT": [
        ("MGT-101", "Principles of Management", "Management functions (planning, organizing, leading, controlling), organizational culture, and decision making."),
        ("MGT-102", "Principles of Marketing", "Marketing mix (4 Ps), consumer behavior, segmentation, targeting, positioning, and digital branding."),
        ("AF-101", "Principles of Financial Accounting I", "Double-entry bookkeeping, journal entries, ledger accounts, trial balance, and financial statement prep."),
        ("AF-102", "Principles of Financial Accounting II", "Depreciation methods, partnership accounts, corporate capital, cash flow statements, and ratios."),
        ("AF-201", "Cost & Management Accounting", "Job costing, process costing, variance analysis, CVP analysis, budgeting, and managerial decision making."),
        ("AF-202", "Business Finance & Financial Markets", "Time value of money, risk and return, bond and stock valuation, financial institutions, and capital structure."),
        ("MGT-203", "Human Resource Management (HRM)", "Recruitment, talent acquisition, training & development, performance appraisals, compensation, and labor relations."),
        ("MGT-204", "Organizational Behavior (OB)", "Workplace motivation, leadership styles, team dynamics, conflict management, and organizational change."),
        ("AF-301", "Financial Management & Corporate Valuation", "Capital budgeting, working capital management, dividend policy, DCF modeling, and M&A basics."),
        ("AF-302", "Auditing & Taxation Compliance (FBR)", "Audit standards, internal controls, audit evidence, Pakistan income tax laws, and sales tax filing."),
        ("MGT-303", "Operations & Supply Chain Management", "Inventory control, EOQ, logistics management, procurement, quality management, and Lean Six Sigma."),
        ("MGT-304", "Entrepreneurship & Small Business Management", "Business plan development, feasibility analysis, startup financing, pitch deck creation, and scaling."),
        ("MGT-401", "Strategic Management", "Industry analysis (Porter's 5 Forces), SWOT/PESTEL, competitive advantage, corporate strategy, and execution."),
        ("MGT-402", "International Business & Trade", "Global trade theories, foreign exchange markets, tariffs, trade agreements, and multinational operations."),
    ],

    # 8. Department of Criminology (CRIM)
    "CRIM": [
        ("CRIM-101", "Fundamentals of Criminology", "Concepts of crime, deviance, biological and sociological theories of criminal behavior."),
        ("CRIM-102", "Criminal Justice System & Police Administration", "Law enforcement agencies, policing models, judiciary, prosecution, and correctional frameworks."),
        ("CRIM-201", "Crime Typologies & Criminal Profiling", "Violent crime, white-collar crime, organized crime, terrorist networks, and behavioral profiling."),
        ("CRIM-202", "Criminal Law & Procedures in Pakistan", "Pakistan Penal Code (PPC), Code of Criminal Procedure (CrPC), and Qanun-e-Shahadat Order."),
        ("CRIM-301", "Crime Scene Investigation & Forensics", "Evidence preservation, fingerprint analysis, ballistics, DNA collection, and chain of custody."),
        ("CRIM-302", "Penology, Prisons & Correctional Systems", "Punishment theories, prison management, probation, parole, and inmate rehabilitation programs."),
        ("CRIM-401", "Cyber Crime & Digital Investigations", "Online fraud, identity theft, dark web tracking, digital evidence handling, and forensic software tools."),
        ("CRIM-402", "Victimology & Human Rights Protections", "Victim rights, trauma support, institutional remedies, and human rights oversight mechanisms."),
    ],

    # 9. Department of Media and Communication Studies (MCS)
    "MCS": [
        ("MCS-101", "Introduction to Mass Communication", "Communication models, media evolution, print, broadcast, digital media, and social influence."),
        ("MCS-102", "News Gathering, Reporting & Sub-Editing", "News values, interviewing techniques, beat reporting, feature writing, and editorial headline crafting."),
        ("MCS-201", "Broadcast Journalism (TV, Radio & Podcasting)", "Studio operations, scriptwriting, voice modulation, teleprompter use, and broadcast production."),
        ("MCS-202", "Digital Media Production & Video Editing", "Premiere Pro, After Effects, camera handling, three-point lighting, audio mixing, and color grading."),
        ("MCS-301", "Public Relations & Corporate Affairs", "Press releases, media relations, crisis management, corporate image building, and stakeholder outreach."),
        ("MCS-302", "Advertising Strategy & Creative Direction", "Campaign planning, copywriting, media buying, digital ad placements, and brand storytelling."),
        ("MCS-401", "Media Laws, Ethics & PEMRA Regulations", "Defamation laws, freedom of expression, intellectual property, PEMRA code of conduct, and ethics."),
        ("MCS-402", "Documentary Film Production & Storytelling", "Documentary genres, narrative arcs, location shooting, field interviews, and post-production."),
    ],

    # 10. Department of Humanities and Arts (HA)
    "HA": [
        ("ISL-101", "Islamic Studies & Moral Ethics", "Quranic teachings, Seerah of Prophet Muhammad (PBUH), Islamic worldview, and ethical responsibilities."),
        ("ISL-201", "Quranic Sciences & Tafseer Studies", "History of Quranic compilation, Asbab al-Nuzul, classical and modern exegesis (Tafseer) methods."),
        ("ISL-202", "Hadith Sciences & Principles of Hadith", "Classification of Hadith (Sahih, Hasan, Da'if), Ilm ar-Rijal, and study of Sahih al-Bukhari & Muslim."),
        ("ISL-301", "Islamic Jurisprudence (Fiqh & Usul-ul-Fiqh)", "Sources of Islamic law (Quran, Sunnah, Ijma, Qiyas), legal maxims, and contemporary Ijtihad."),
        ("PAK-101", "Pakistan Studies & Constitutional History", "Ideology of Pakistan, Pakistan Movement, constitutional development (1956, 1962, 1973), and foreign relations."),
        ("HA-201", "Introduction to Philosophy & Critical Logic", "Epistemology, metaphysics, deductive and inductive reasoning, logic fallacies, and ethical theories."),
        ("HA-202", "Art History, Aesthetics & Visual Culture", "Artistic movements from classical antiquity, Mughal architecture, Renaissance art to contemporary painting."),
        ("HA-301", "Professional Ethics & Civic Engagement", "Code of ethics in professional life, whistleblowing, corporate citizenship, and community leadership."),
    ],

    # 11. Faculty of Languages (FL)
    "FL": [
        ("FL-101", "Functional Urdu & Advanced Composition", "Urdu orthography, essay writing, literary idioms, and linguistic expression."),
        ("FL-102", "Classical Urdu Literature, Ghazal & Nazm", "Mir, Ghalib, Iqbal, Faiz, study of classical poetic forms, and literary criticism."),
        ("FL-201", "Arabic Language Fundamentals I", "Arabic alphabet, phonetics, daily conversational phrases, and basic sentence construction."),
        ("FL-202", "Arabic Grammar & Morphology (Nahw & Sarf)", "Detailed inflection rules, verb conjugations, noun declensions, and Quranic Arabic analysis."),
        ("FL-301", "Persian Language & Classical Heritage", "Persian script, vocabulary, poetry of Rumi, Hafiz, Saadi, and literary translation."),
        ("FL-302", "French for Beginners & Conversational Skills", "French grammar, vocabulary, pronunciation, listening comprehension, and DELF A1 preparation."),
    ],

    # 12. Faculty of Basic Sciences (FBS)
    "FBS": [
        ("BIO-101", "Cell Biology & Genetics", "Cell structure, organelles, membrane transport, Mendelian inheritance, and chromosomal basis of heredity."),
        ("BIO-102", "General Microbiology & Immunology", "Bacteria, viruses, fungi, staining techniques, innate and adaptive immunity, and antibodies."),
        ("BIO-201", "Molecular Biology & Recombinant DNA", "DNA replication, transcription, translation, gene regulation, cloning vectors, and restriction enzymes."),
        ("BIO-202", "Biochemistry & Enzymology", "Proteins, carbohydrates, lipids, nucleic acids, metabolic pathways (glycolysis, Krebs cycle), and enzyme kinetics."),
        ("BIO-301", "Bioprocess Technology & Fermentation", "Bioreactor design, microbial fermentation, downstream processing, and industrial bio-products."),
        ("BIO-302", "Bioinformatics & Computational Biology", "NCBI databases, BLAST, sequence alignment, phylogenetic analysis, and molecular modeling tools."),
        ("BIO-401", "Genetic Engineering & CRISPR Gene Editing", "Gene knockout, CRISPR-Cas9 mechanisms, transgenic plants/animals, and biosafety guidelines."),
        ("BIO-402", "Environmental & Agricultural Biotechnology", "Bioremediation, biofertilizers, genetically modified crops, and waste management biotechnology."),
    ],

    # 13. Department of Allied Health and Molecular Sciences (AHMS)
    "AHMS": [
        ("AHMS-101", "Human Anatomy & Structural Physiology", "Skeletal, muscular, circulatory, respiratory, nervous, and digestive systems in human health."),
        ("AHMS-102", "General Pathology & Disease Mechanisms", "Cellular adaptation, inflammation, necrosis, neoplasia, tissue repair, and hemodynamic disorders."),
        ("AHMS-201", "Clinical Biochemistry & Diagnostic Testing", "Liver function tests, renal panels, lipid profiles, cardiac markers, and automated clinical chemistry."),
        ("AHMS-202", "Hematology & Blood Banking Science", "Blood cell morphology, anemias, leukemias, coagulation assays, ABO/Rh typing, and cross-matching."),
        ("AHMS-301", "Medical Microbiology & Parasitology", "Pathogenic bacteria, antimicrobials, culture media, parasitological identification, and mycology."),
        ("AHMS-302", "Molecular Diagnostics & PCR Laboratory", "Nucleic acid extraction, real-time qPCR, DNA sequencing, gel electrophoresis, and diagnostic assays."),
        ("AHMS-401", "Pharmacology & Therapeutics", "Drug mechanisms, pharmacokinetics, pharmacodynamics, adverse drug reactions, and clinical dosage."),
        ("AHMS-402", "Laboratory Instrumentation & Quality Assurance", "Spectrophotometry, flow cytometry, ELISA readers, centrifuge calibration, and laboratory accreditation standards."),
    ],

    # 14. Department of Chemistry (CHEM)
    "CHEM": [
        ("CHEM-101", "General & Inorganic Chemistry", "Periodic table trends, chemical bonding, transition metals, coordination complexes, and solid state."),
        ("CHEM-102", "Fundamental Organic Chemistry", "Hydrocarbons, functional groups, isomerism, nomenclature, and basic organic synthesis routes."),
        ("CHEM-201", "Physical Chemistry & Chemical Thermodynamics", "Laws of thermodynamics, chemical equilibrium, electrochemistry, and reaction kinetics."),
        ("CHEM-202", "Analytical Chemistry & Instrumental Methods", "Volumetric/gravimetric analysis, UV-Vis spectrophotometry, FTIR spectroscopy, chromatography (HPLC, GC)."),
        ("CHEM-301", "Organic Reaction Mechanisms & Stereochemistry", "Nucleophilic substitution (SN1, SN2), elimination (E1, E2), aromatic substitution, and chirality."),
        ("CHEM-302", "Biochemistry & Biomolecular Chemistry", "Chemical structures of amino acids, carbohydrates, lipids, vitamins, and bio-energetics."),
        ("CHEM-401", "Industrial & Polymer Chemistry", "Fertilizers, cement, petroleum refining, synthetic polymers, polymerization mechanisms, and materials."),
        ("CHEM-402", "Environmental Chemistry & Green Technologies", "Atmospheric chemistry, water pollution parameters, hazardous waste treatment, and green catalytic synthesis."),
    ],

    # 15. Department of Mathematics (MATH)
    "MATH": [
        ("MATH-101", "Calculus I (Single Variable Calculus)", "Functions, limits, continuity, differentiation techniques, curve sketching, and definite/indefinite integrals."),
        ("MATH-102", "Calculus II (Multivariate & Vector Calculus)", "Partial derivatives, multiple integrals, line/surface integrals, Green's theorem, and Stokes' theorem."),
        ("MATH-201", "Linear Algebra & Matrix Theory", "Systems of linear equations, matrices, determinants, vector spaces, eigenvalues, eigenvectors, and diagonalization."),
        ("MATH-202", "Differential Equations (ODEs & PDEs)", "First and higher-order ODEs, Laplace transforms, Fourier series, separation of variables, and wave equations."),
        ("MATH-301", "Complex Analysis", "Complex numbers, analytic functions, Cauchy-Riemann equations, contour integration, and residue theorem."),
        ("MATH-302", "Numerical Analysis & Scientific Computation", "Root-finding (Newton-Raphson), interpolation, numerical integration, numerical ODE solving, and MATLAB."),
        ("STAT-101", "Probability & Applied Statistics", "Probability distributions (Binomial, Poisson, Normal), random variables, expectations, and descriptive statistics."),
        ("STAT-201", "Inferential Statistics & Regression Analysis", "Hypothesis testing, confidence intervals, t-tests, ANOVA, chi-square tests, simple/multiple linear regression."),
        ("MATH-401", "Optimization Techniques & Operations Research", "Linear programming, Simplex algorithm, duality, transport problems, and nonlinear optimization."),
    ],

    # 16. Department of Physics (PHY)
    "PHY": [
        ("PHY-101", "Mechanics & Wave Motion", "Newtonian dynamics, conservation laws, rotational motion, gravitation, fluid mechanics, and harmonic oscillation."),
        ("PHY-102", "Electricity & Magnetism", "Electrostatics, Gauss's law, electric potential, capacitance, magnetic fields, Ampere's law, and Faraday's law."),
        ("PHY-201", "Modern Physics & Quantum Mechanics", "Special relativity, photoelectric effect, Compton scattering, de Broglie wavelength, and Schrodinger wave equation."),
        ("PHY-202", "Thermal & Statistical Physics", "Kinetic theory of gases, heat engines, entropy, Maxwell-Boltzmann, Fermi-Dirac, and Bose-Einstein distributions."),
        ("PHY-301", "Semiconductor Physics & Electronics", "Energy bands, p-n junctions, diodes, BJTs, MOSFETs, operational amplifiers, and digital logic circuits."),
        ("PHY-302", "Solid State Physics", "Crystal structures, X-ray diffraction (Bragg's law), lattice vibrations, thermal properties, and superconductivity."),
        ("PHY-401", "Electrodynamics & Laser Physics", "Maxwell's equations, electromagnetic wave propagation, waveguides, population inversion, and laser optics."),
        ("PHY-402", "Nuclear & Particle Physics", "Nuclear structure, radioactive decay, nuclear fission & fusion, particle accelerators, and Standard Model quarks."),
    ],
}


def seed_courses():
    print("Beginning course seeding across all 16 departments...")

    dept_map = {d.short_name.upper(): d for d in Department.objects.all()}
    print(f"Found {len(dept_map)} departments in common_department table: {list(dept_map.keys())}")

    courses_to_create = []

    for short_name, courses in DEPARTMENT_COURSES.items():
        dept = dept_map.get(short_name.upper())
        if not dept:
            dept = Department.objects.filter(name__icontains=short_name).first()
            if not dept:
                print(f"Warning: Could not find Department matching key '{short_name}'")
                continue

        for code, title, desc in courses:
            courses_to_create.append(
                AcademicCourse(
                    code=code,
                    title=title,
                    department=dept,
                    description=desc,
                    is_active=True,
                )
            )

    with transaction.atomic():
        AcademicCourse.objects.all().delete()
        AcademicCourse.objects.bulk_create(courses_to_create)

    total_courses = AcademicCourse.objects.count()
    print(f"✅ Seeding Complete! Total Courses in DB: {total_courses}")

    for dept in Department.objects.all().order_by("id"):
        count = dept.courses.count()
        print(f"  • ID {dept.id:2d} | [{dept.short_name:4s}] {dept.name}: {count} courses")


if __name__ == "__main__":
    seed_courses()
