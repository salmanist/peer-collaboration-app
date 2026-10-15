import random

from django.core.management.base import BaseCommand

from accounts.models import User
from apps.library.models import LibraryProject, Note
from common.models import AcademicCourse, Department

P = LibraryProject.Status
L = LibraryProject.Level

# (author email, title, department short name, level, status, github link, abstract)
DEMO_PROJECTS = [
    ("zunaira@lgu.edu.pk", "Campus Navigator App", "CS", L.FYP, P.APPROVED, "https://github.com/demo/campus-navigator",
     "A mobile app that guides new students around the LGU campus with indoor maps, class timetable reminders and shortcuts between blocks."),
    ("salman@lgu.edu.pk", "Smart Attendance with Face Recognition", "AI", L.FYP, P.APPROVED, "https://github.com/demo/face-attendance",
     "Marks classroom attendance automatically from a single photo using a face-recognition model, and exports a weekly report for teachers."),
    ("zahra@lgu.edu.pk", "Library Book Finder", "CS", L.SEMESTER, P.APPROVED, "https://github.com/demo/book-finder",
     "Search and reserve books from the university library by title, author or course code, with a shelf-location hint."),
    ("hello@lgu.edu.pk", "Student Expense Tracker", "MGT", L.SIMPLE, P.APPROVED, "",
     "A simple budgeting tool for students: log daily spending, set a monthly limit and see where the money goes."),
    ("cup@lgu.edu.pk", "Phishing Email Detector", "CYS", L.SEMESTER, P.APPROVED, "https://github.com/demo/phishing-detector",
     "A browser add-on that scores incoming emails for phishing signs such as look-alike domains and urgent wording."),
    ("paint@lgu.edu.pk", "Sentiment Analysis of Course Feedback", "AI", L.SEMESTER, P.APPROVED, "https://github.com/demo/feedback-sentiment",
     "Classifies free-text course feedback as positive, neutral or negative and highlights the most common complaints per course."),
    ("zunaira@lgu.edu.pk", "Online Exam Seating Planner", "CS", L.SIMPLE, P.APPROVED, "",
     "Generates seating plans for exam halls that keep students of the same course apart."),
    ("salman@lgu.edu.pk", "Peer Tutor Matching Engine", "CS", L.SEMESTER, P.PENDING, "https://github.com/demo/tutor-matching",
     "Matches students who need help in a course with senior students who scored well in it, based on availability."),
    ("zahra@lgu.edu.pk", "Water Quality Monitor", "CHEM", L.SIMPLE, P.PENDING, "",
     "Low-cost sensor kit and dashboard that tracks drinking-water quality in the hostels."),
    ("hello@lgu.edu.pk", "Weather Widget", "CS", L.SIMPLE, P.REJECTED, "",
     "A small weather widget. Needs a clearer abstract and a working demo link before it can be approved."),
]

# (author email, title, course code, semester, description)
DEMO_NOTES = [
    ("zunaira@lgu.edu.pk", "OOP Concepts Cheat Sheet", "CS-201", "Fall 2025", "One-page summary of classes, inheritance, polymorphism and encapsulation with short C++ examples."),
    ("salman@lgu.edu.pk", "DSA: Sorting Algorithms Explained", "CS-202", "Spring 2026", "Step-by-step walkthroughs of bubble, merge and quick sort with time-complexity table."),
    ("zahra@lgu.edu.pk", "SQL Joins Made Easy", "CS-301", "Fall 2025", "Visual guide to inner, left, right and full joins with practice queries."),
    ("hello@lgu.edu.pk", "Operating Systems: Process Scheduling", "CS-302", "Spring 2026", "Notes on FCFS, SJF, Round Robin and priority scheduling with worked Gantt charts."),
    ("cup@lgu.edu.pk", "Networking Layers Summary", "CS-305", "Fall 2025", "OSI vs TCP/IP model, what each layer does, and common protocols at every layer."),
    ("paint@lgu.edu.pk", "Machine Learning Midterm Revision", "AI-301", "Spring 2026", "Linear regression, decision trees, overfitting and evaluation metrics in one revision pack."),
    ("zunaira@lgu.edu.pk", "Neural Networks Basics", "AI-302", "Spring 2026", "Neurons, activation functions, backpropagation intuition and a tiny worked example."),
    ("salman@lgu.edu.pk", "Software Engineering: UML Diagrams", "CS-401", "Fall 2025", "Use case, class and sequence diagrams with a small library-system example."),
    ("zahra@lgu.edu.pk", "Cryptography Quick Notes", "CYS-202", "Spring 2026", "Symmetric vs asymmetric encryption, hashing and digital signatures explained simply."),
    ("hello@lgu.edu.pk", "Academic Writing Tips", "ENG-401", "Fall 2025", "How to structure a research paper, cite sources and avoid plagiarism."),
    ("cup@lgu.edu.pk", "Web Engineering: REST API Basics", "CS-403", "Spring 2026", "HTTP methods, status codes and designing clean REST endpoints, with examples."),
    ("paint@lgu.edu.pk", "Discrete Maths: Logic and Sets", "CS-203", "Fall 2025", "Truth tables, set operations and proof techniques with solved problems."),
]


class Command(BaseCommand):
    help = "Add dummy Digital Library projects and notes (no file attachments). Safe to run again; use --reset to remove the dummy rows first."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete the dummy projects and notes before adding them again.")

    def handle(self, *args, **options):
        users = {user.email: user for user in User.objects.filter(email__in={row[0] for row in DEMO_PROJECTS + DEMO_NOTES})}
        if options["reset"]:
            LibraryProject.objects.filter(title__in=[row[1] for row in DEMO_PROJECTS], author__in=users.values()).delete()
            Note.objects.filter(title__in=[row[1] for row in DEMO_NOTES], author__in=users.values()).delete()

        departments = {department.short_name: department for department in Department.objects.all()}
        courses = {course.code: course for course in AcademicCourse.objects.all()}
        voters = list(users.values())
        rng = random.Random(7)  # same dummy upvotes/bookmarks every run

        added_projects = added_notes = 0
        for email, title, dept, level, status, github, abstract in DEMO_PROJECTS:
            author = users.get(email)
            if author is None:
                self.stdout.write(self.style.WARNING(f"Skipped '{title}': no user {email}"))
                continue
            project, created = LibraryProject.objects.get_or_create(
                author=author,
                title=title,
                defaults={"department": departments.get(dept), "level": level, "status": status, "github_link": github, "abstract": abstract},
            )
            if created:
                added_projects += 1
                project.upvoted_by.set(rng.sample(voters, rng.randint(0, len(voters))))
                project.bookmarked_by.set(rng.sample(voters, rng.randint(0, 3)))

        for email, title, code, semester, description in DEMO_NOTES:
            author = users.get(email)
            if author is None:
                self.stdout.write(self.style.WARNING(f"Skipped '{title}': no user {email}"))
                continue
            note, created = Note.objects.get_or_create(
                author=author, title=title, defaults={"course": courses.get(code), "semester": semester, "description": description}
            )
            if created:
                added_notes += 1
                note.upvoted_by.set(rng.sample(voters, rng.randint(0, len(voters))))
                note.bookmarked_by.set(rng.sample(voters, rng.randint(0, 3)))

        self.stdout.write(self.style.SUCCESS(f"Added {added_projects} projects and {added_notes} notes."))
