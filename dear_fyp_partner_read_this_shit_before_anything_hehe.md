**This file is supposed to help you understand what the folder contains right now on 8th august, 2026 Saturday**

- CLAUDE.md file contains the instructions claude will read at start of every session, don't make any change unless necessary and must inform.

- documentaion.txt will contain data how the system will work. You dont have to do anything, in CLAUDE.md, claude is instructued to write everything in doc.txt file.

- history.txt is the file that acts like a journal entry, contains logs of each change made by you or me with timestamp, this too is instructed in CLAUDE.md file, you don't have to do anything.

- how_we'll_work.md contains data on how we both will work side by side.

- requirements.txt is the file that contains all tools requirements for this project, just ask your claude to install requirements.txt and it will handle that too.

- SRS.md is the markdown version of our srs, nothing special

- backend folder is the contains django backend and rest api

- while mobile folder is our front end.

- system_design.md is the architecture, backend, API design of our system.

So our requirements(SRS.md), architecture design (system_design.md) is done, now we are supposed to start coding, go read how-we'll-work.md file.


**For testing our auth module**

run these commands in cli

cd backend
.venv\Scripts\activate
python manage.py runserver


 then visit http://127.0.0.1:8000/test/ in browser, its only fir testing

 we create an email in db, which we will connect to db at prodcution time, for testign we will create an email, then we can use it register as student and login, must check.
