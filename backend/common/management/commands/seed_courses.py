"""Add a broad set of university courses to the course table. Add-only and repeatable: existing course codes are left as they are,
nothing is deleted, and departments are only looked up (never created) by their short name."""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.peer_tutoring.models import AcademicCourse
from common.models import Department

# (code, title, department short_name)
COURSES = [
    # Computer Science
    ("CS-102", "Object Oriented Programming", "CS"), ("CS-202", "Discrete Structures", "CS"),
    ("CS-203", "Digital Logic Design", "CS"), ("CS-301", "Computer Organization and Assembly Language", "CS"),
    ("CS-303", "Operating Systems", "CS"), ("CS-304", "Design and Analysis of Algorithms", "CS"),
    ("CS-305", "Computer Networks", "CS"), ("CS-306", "Software Engineering", "CS"),
    ("CS-401", "Theory of Automata", "CS"), ("CS-402", "Compiler Construction", "CS"),
    ("CS-403", "Web Engineering", "CS"), ("CS-404", "Mobile Application Development", "CS"),
    ("CS-405", "Parallel and Distributed Computing", "CS"), ("CS-406", "Human Computer Interaction", "CS"),
    # Artificial Intelligence
    ("AI-101", "Introduction to Artificial Intelligence", "AI"), ("AI-201", "Data Mining", "AI"),
    ("AI-302", "Natural Language Processing", "AI"), ("AI-303", "Computer Vision", "AI"),
    ("AI-401", "Deep Learning", "AI"), ("AI-402", "Reinforcement Learning", "AI"),
    # Cyber Security
    ("CYS-101", "Introduction to Cyber Security", "CYS"), ("CYS-201", "Cryptography", "CYS"),
    ("CYS-301", "Network Security", "CYS"), ("CYS-302", "Digital Forensics", "CYS"),
    ("CYS-401", "Ethical Hacking and Penetration Testing", "CYS"), ("CYS-402", "Malware Analysis", "CYS"),
    # English
    ("ENG-101", "Functional English", "ENG"), ("ENG-102", "Expository Writing", "ENG"),
    ("ENG-201", "Introduction to Linguistics", "ENG"), ("ENG-202", "Introduction to Literature", "ENG"),
    ("ENG-301", "Communication Skills", "ENG"),
    # Management Sciences
    ("MGT-101", "Principles of Management", "MGT"), ("MGT-102", "Financial Accounting", "MGT"),
    ("MGT-201", "Marketing Management", "MGT"), ("MGT-202", "Organizational Behavior", "MGT"),
    ("MGT-301", "Human Resource Management", "MGT"), ("MGT-302", "Financial Management", "MGT"),
    ("MGT-303", "Entrepreneurship", "MGT"), ("MGT-401", "Strategic Management", "MGT"),
    # Mathematics
    ("MTH-102", "Linear Algebra", "MATH"), ("MTH-201", "Multivariable Calculus", "MATH"),
    ("MTH-202", "Differential Equations", "MATH"), ("MTH-203", "Probability and Statistics", "MATH"),
    ("MTH-301", "Numerical Analysis", "MATH"), ("MTH-302", "Real Analysis", "MATH"),
    # Physics
    ("PHY-101", "Mechanics", "PHY"), ("PHY-102", "Electricity and Magnetism", "PHY"),
    ("PHY-201", "Waves and Optics", "PHY"), ("PHY-301", "Quantum Mechanics", "PHY"),
    # Chemistry
    ("CHEM-101", "General Chemistry", "CHEM"), ("CHEM-201", "Organic Chemistry", "CHEM"),
    ("CHEM-202", "Physical Chemistry", "CHEM"), ("CHEM-301", "Analytical Chemistry", "CHEM"),
    # Psychology
    ("PSY-101", "Introduction to Psychology", "PSY"), ("PSY-201", "Developmental Psychology", "PSY"),
    ("PSY-301", "Abnormal Psychology", "PSY"), ("PSY-302", "Research Methods in Psychology", "PSY"),
    # Media and Communication Studies
    ("MCS-101", "Introduction to Mass Communication", "MCS"), ("MCS-201", "Journalism", "MCS"),
    ("MCS-301", "Public Relations", "MCS"), ("MCS-302", "Digital Media Production", "MCS"),
    # Criminology
    ("CRIM-101", "Introduction to Criminology", "CRIM"), ("CRIM-201", "Criminal Law", "CRIM"),
    ("CRIM-301", "Forensic Science", "CRIM"),
    # Humanities and Arts / Languages / Social Sciences
    ("HA-101", "Islamic Studies", "HA"), ("HA-102", "Pakistan Studies", "HA"), ("HA-201", "Ethics", "HA"),
    ("FL-101", "Urdu Language", "FL"), ("FL-102", "Arabic Language", "FL"), ("FL-201", "Translation Studies", "FL"),
    ("FSS-101", "Introduction to Sociology", "FSS"), ("FSS-102", "Introduction to Economics", "FSS"),
    ("FSS-201", "Political Science", "FSS"),
    # Basic Sciences / Allied Health
    ("FBS-101", "Applied Physics", "FBS"), ("FBS-102", "Technical and Report Writing", "FBS"),
    ("AHMS-101", "Human Anatomy", "AHMS"), ("AHMS-102", "Biochemistry", "AHMS"),
    ("AHMS-201", "Molecular Biology", "AHMS"), ("AHMS-202", "Microbiology", "AHMS"),
]


class Command(BaseCommand):
    help = "Add many university courses to the course table (add-only, safe to run again)."

    @transaction.atomic
    def handle(self, *args, **options):
        departments = {d.short_name: d for d in Department.objects.all()}
        existing = set(AcademicCourse.objects.values_list("code", flat=True))
        new_courses, skipped = [], []
        for code, title, short_name in COURSES:
            department = departments.get(short_name)
            if department is None:
                skipped.append(code)
            elif code not in existing:
                new_courses.append(AcademicCourse(code=code, title=title, department=department))
        AcademicCourse.objects.bulk_create(new_courses)
        self.stdout.write(self.style.SUCCESS(
            f"Added {len(new_courses)} courses, {len(COURSES) - len(new_courses) - len(skipped)} already present"
            + (f", skipped {len(skipped)} (department not found: {', '.join(skipped)})." if skipped else ".")
        ))
