
# **1. Introduction** 

The Academic Peer Collaboration and Networking System is a modern mobile based platform designed to enhance collaboration, communication, and resource sharing among students within the university environment. In today's educational landscape, learning is not limited to classrooms; instead, it involves interaction, peer support, mentorship, and access to diverse academic resources [1]. Mobile technology has employed wireless technologies to communicate, think, learn, and share information, and using mobile technologies in learning and teaching can create a positive and more engaging environment in higher education [2]. However, most universities still rely on informal and unstructured communication platforms, which often lead to inefficiencies, lack of accessibility, and missed opportunities for collaboration. Although informal platforms like WhatsApp are widely used, formal educational platforms also have limitations when it comes to meeting the demands for fast and structured communication that characterize modern learning environments  access barriers, rigid structures, and lack of immediacy in interaction can hinder the natural flow of communication, limiting their effectiveness in situations where real time collaboration is crucial [3]. This system aims to overcome these challenges by providing a centralized, secure, and organized platform where students can connect, share resources, seek guidance, and support each other in both academic and daily activities. Research in peer to peer mobile learning systems highlights the importance of secure, institution bound communication frameworks where mobile middleware enables students to communicate within the campus and share files and data efficiently [4]. By integrating features such as ride sharing, peer tutoring, resource exchange, digital library, community support, and AI based assistance, the system ensures a comprehensive and efficient student collaboration experience. 

## **1.1 Purpose** 

This is a Software Requirement Specification (SRS) document to describe the requirement of Academic Peer Collaboration and Networking System version 1.0. To enable the students of Lahore Garrison University to meet, interact and support each other to the mobile based platform at a single point with regard to their academic and other activities. This document contains functional and non-functional requirements to the system and various modules such as ride sharing, peer tutoring, resource sharing, digital library, community support, AI chatbot integration 

etc. It is used to help developers, designers, testers and stakeholders understand the system functions and ensure that the final product meets the user expectations. This document covers the scope of any system features, user interactions, constraints, and performance requirements that would be needed to successfully develop and deploy the application. 

## **1.2 Document Conventions** 

This document uses the standard format, which is aimed at ensuring clarity, consistency and professionalism throughout the Software Requirement Specification. The document is written in the main font “times new roman” and it is written in normal size (12 points). Bold and Hierarchy: Main headings are in bold and font size 16, and sub headings are in font size 14. Line spacing is used as 1.5 line and proper spacing between lines is applied to improve readability. 

## **1.3 Intended Audience and Reading Suggestions** 

**Developers:** Focus on system requirements, architecture, and implementation details. 

**Project Managers:** Review project scope, objectives, and system features for planning and management. 

**Testers:** Use functional and non-functional requirements to design test cases. 

**End Users (Students):** Understand system usage and available features. 

**Documentation Writers:** Prepare user manuals and guides based on system functionalities. 

## **1.4 Product Scope** 

We have developed a mobile application “Peer Collaboration and Networking System” as an institutional platform which can be a centralized platform for students of Lahore Garrison University to connect with each other and avail academic, social and resource related assistance. Our system provides a structured and secure space for students to communicate in a safe space where key student services are all in one place instead of the informal communication space students are already using. 

The application includes the following six basic modules. The Resource Sharing Module allows the students to plan for access to the print resources and other resources (such as textbooks and stationery) in a more formal and reliable way than a casual approach to requesting resources. The purpose of the Ride Sharing Module is to address the daily need for commuter students to get to and from campus by matching other students who are commuting to school from similar locations and thereby reducing the commuting expenses and alleviating the campus parking pressure. The module on Peer Tutoring and Career Guidance matches students in need of academic assistance with informed peers, and also provides mentorship and guidance for careers-related topics from seniors and alumni. The Lost and Found Module offers a unique digital platform to report and find lost items at school which is unavailable at this time via any formal reporting pathway. The Digital Library Module keeps accumulating the project ideas, Final year Project references, Academic papers and resources contributed by the students and professors, thus decreasing the research time of every new set of students. Study groups, academic discussions and institutional announcements are held in an organized forum-style environment in the Community Support Module. Furthermore, there is an embedded AI Chatbot that can be used by students 24/7 to address their inquiries about university policies, course registration, available tools and deadlines, and offer immediate, personalized assistance rather than relying on office hours. 

User authentication ensures that only registered users of the platform can access it, maintaining data security and the integrity of interactions between students, as the student's email address is verified. These are targeted for every student in the university, from the freshmen who are adjusting to campus life, the seniors who can share knowledge and guidance, the students who don't have money to spare for bus fares, the ones who benefit from sharing, the faculty who can use the sharing module to post news, and everyone else. This multi-module integration creates our solution more complete, efficient and meaningful than any single existing solution out there today. 

# **2. Overall Description** 

## **2.1 Product Perspective** 

The Peer Collaboration and Networking System is a newly launched standalone mobile application specially created for the students of Lahore Garrison University. It is not intended to be any 

replacement of any existing official system but will be a platform that will fill a void that has been not addressed structuredly at an institutional level, where students can interact with each other, shared resources, and support each other academically and day to day. 

Students at LGU use informal channels like threads on Reddit or personal WhatsApp groups to find tutors, notes, rides, or to get information on the university policies. These channels are operational, yet they remain disorganized, inconsistent and are not connected to any official structure. The proposed system is designed to provide an alternative to all that, in one secure, verified platform. 

The application runs on a mobile facing frontend (developed in React Native with Expo), a backend (developed in Django, which is an AI backed Python framework for creating backend services) that handles business logic and data, a PostgreSQL database for persistent data storage, and an AI layer developed using Retrieval Augmented Generation (RAG), which provides the functionality for the chatbot feature. The entire application is connected to the backend API and access by the user is restricted by the institutional email verification. The overall architecture conceptually is captured in the below diagram. 

## **2.2 Product Functions** 

In general, the system has the following main functional areas: 

- Ride Sharing: Students can post and find rides based on shared routes, transport costs will be reduced, and students will also connect with each other. 

- Resource Sharing: Students share notes, books, essentials of daily life and other necessary items of an academic or routine nature, based on a structured listing system. 

- Peer Tutoring and Mentorship: Access to subject-specific tutoring, career advice and mentorship from senior students who have taken similar academic courses. 

- Lost and found: A special section allows students to post and find lost items on campus. 

- Digital Library: A place where students store their projects, research projects with proof of work and approved project ideas that can be accessed and referenced by other students. 

- Community and Announcements: Study groups, group discussions, and events and workshop announcements are posted via a structured community board. 

- Printing Services: Students can log print jobs on the app and do not have to wait in person to get it. 

- AI Chatbot: A Chatbot that is context aware and is trained with university data to answer queries related to university policies, registration process, available paid tools, course information, and give suggestions about project ideas. 

## **2.3 User Classes and Characteristics** 

There are two types of users for the system primary and secondary. 

As the learning platform is designed around the academic and social and resource needs of the students of Lahore Garrison University, the primary class of users are the verified students of Lahore Garrison University. There are some interesting differences within this class. It is expected that the junior students (first and second year) will utilize peer tutoring, mentoring, and AI chatbot the most. Are not as comfortable with University systems and require more direction in administrative and academic areas. Senior students, however, have a higher tendency to be tutors, mentors, and contributors of the digital library. They can also benefit from ride sharing and resource sharing options. All primary users must use their official LGU email to log in to make the environment trusted and accountable. 

Secondary user class: Users who are involved in the system indirectly or infrequently. This includes any developers or maintainers who are using the system for debugging, updating and monitoring of its performance and student moderators who have been assigned to ensure that listings, posts and flagged content are safe for use. These users are not the main target population for which the system is being developed but their use of the system is required for its efficient operation. The first release does not include an administration side interface, which means that secondary users have limited access to the system, mainly in the backend. 

## **2.4 Operating Environment** 

The application will be a mobile app that is available for Android and iOS platforms. It is built with React Native and Expo (managed workflow, using EAS Build for native binaries), which means that a single TypeScript codebase runs on both operating systems, eliminating the need for a separate codebase per platform. 

The backend is developed with Django and hosted on a cloud server (HTTPS). PostgreSQL is used in the database layer. The AI chatbot interface needs to be connected to a language model inference API and a retrieval index for the institutional documents. Most features will require network access, but for some light-weight content such as recently viewed resources and announcements, these may be stored locally for short term offline access. 

As far as devices are concerned, it'll support any Android device running Android 8.0 or later, and iOS devices running iOS 13 or newer. The only special hardware that is required is a standard smart phone with internet connection. 

## **2.5 Design and Implementation Constraints** 

There are several constraints that will affect the design of the system. It's quite significant that all users (registered or not) should be students of the LGU and should be authenticated using the institutional email domain. This is a conscious security perimeter which is not to be compromised. 

Front-end technology: The team has decided to use React Native with Expo (managed workflow, TypeScript), and the back-end will be Django as agreed. It is not possible to change frameworks mid project because of the time frame. Likewise, PostgreSQL has been selected because of its ability to interoperate with Django and its strength when it comes to relational data. 

The quality and completeness of the institutional knowledge base it is trained on is the key factor that determines the quality of the AI chatbot. The answers provided by the chatbot will match the information provided in the university's policy documents or if they do not exist, they will be outdated or obsolete. This is an area that the team will not be able to control completely. 

The scope is potentially challenging and features may be phased or trimmed in the academic semester to be delivered. The agile paradigm of software development takes this into consideration, and prioritizes the core modules first. 

## **2.6 User Documentation** 

The following documents will be provided with the application: 

- A user guide that communicates all the major features in a non-technical fashion. 

- An in app walkthrough that plays on first login and helps new users get familiar with the most important modules. 

- An embedded FAQ within the app that addresses user queries on account configuration, listing books, and utilizing the chatbot. 

- A technical handover document for future maintainers, which outlines the backend architecture, the setup of the database schema and how the AI integration is implemented. 

## **2.7 Assumptions and Dependencies** 

The requirements in this document are based on a few assumptions. Assumption #1: The students from the LGU have smartphones they can use to run the app; Assumption #2: They have mobile data connection or they can connect to Wi-Fi on the campus. Secondly, it is assumed that the university will cooperate in providing access to policy documents and institutional data that will be used to train the AI chatbot. For the project to succeed, external services and tools are required to continue to be available: the React Native/Expo SDK and associated packages, Django and its ecosystem, PostgreSQL and the chosen cloud hosting provider for deployment. Any disruption to these services during development could cause delays. The RAG based chatbot also requires access to a large language model API, which has continuous costs, and needs to be budgeted for. 

# **3. External Interface Requirements** 

## **3.1 User Interfaces** 

The Academic Peer Collaboration and Networking System will offer a contemporary, easy to use and responsive mobile system, making it easy and accessible for all students. The application will be designed with a focus on mobile UI/UX, adhering to standard design principles and providing a consistent UI/UX in each screen of the application. The interface will feature a dashboard with some key features including ride sharing, resource sharing, peer tutoring, digital library, and community support. All modules will be available via easy-to-navigate icons and menus. 

All users are students, and the system will have role based interfaces that allow them to perform different actions, like offering services, requesting help, etc. Simple forms and interactive sections will be used to design features such as ride requests, resources, study groups, and project ideas. As the notifications occur, they will be advertised and presented to users. The design will be responsive, ensuring it looks and performs well on different screen sizes and mobile devices, such 

as Android and iOS. The errors and validation will be well displayed to the user which will assist him/her and prevent him/her from entering the wrong value. 

## **3.2 Hardware Interfaces** 

The system is to be a mobile based application and will be used mainly on smart phones and tablets. The user will use their own mobile device, with at least 2GB RAM, sufficient data storage and a reliable internet connection. The system could also incorporate in-built devices like GPS for ride sharing, which enables matching of routes between riders going to similar destinations. The server will need to have a robust infrastructure with sufficient processing power, memory, and storage to store user data, process requests, and facilitate real-time communication. The server environment must be high-availability and scalable so that multiple users are able to use the server at the same time without compromising performance. 

## **3.3 Software Interfaces** 

The Academic Peer Collaboration and Networking System will be connected with different software elements to ensure smooth functioning and integration of the system. Front end will be developed using React Native with Expo (cross platform) for both Android and iOS devices. This will be created in the backend using Django that will have server side logic and will handle the communication between the client and the database, as well as managing the API's. PostgreSQL will be the main database used for the system, with user data, resources, ride information, and other application data securely stored. Integration with third party services might involve storage of shared resources and documents on cloud storage platforms, and notification services for providing real time notifications to users. Moreover, the AI chatbot will be made using the Natural Language Processing (NLP) technique and may use external AI services or APIs to provide intelligent answers based on the institutional information. The system will also provide secure authentication methods like email verification, enabling regulated access. 

## **3.4 Communications Interfaces** 

The system will use internet based communications to facilitate interaction between user and system components. All communications will be via secure protocols (HTTPS) to ensure data privacy and protection. The application will have real time communications capabilities that will 

provide users with notifications, updates and alerts to the application so they will know what is happening in the community – for example, ride requests, tutoring sessions, availability of resources, and ongoing community conversations. The system can also be linked with push notification solutions to provide real-time updates immediately to users' gadgets. RESTful APIs will facilitate seamless communication between the mobile app and the backend server, enabling efficient data exchange and synchronisation. Also, the platform can include messaging or interaction functionality in the community section to enable students to discuss and collaborate in the community. Secure communication channels and data encryption will be used to ensure user data confidentiality and integrity. 

# **4. System Features** 

Each major module of the Peer Collaboration and Networking System is detailed below, including its priority, anticipated stimulus response behavior and functional requirements. 

## **4.1 Ride Sharing Module** 

### **4.1.1 Description and Priority** 

In this module, students can share rides or select the ones they want to ride with a co-worker by matching travel routes. Students may post when travelling to a destination and other students who are travelling to the same destination may request to join the student. The aim is straightforward: cut transport costs, improve the safety of commuters and establish an organic link between pupils who reside in the same neighbourhoods. High priority as students often complain about costs associated with transport and there is no official ride pooling system. 

### **4.1.2 Stimulus/Response Sequences** 

- A student clicks on Ride Sharing and taps on Offer a Ride. The system displays the form to enter the departure place, destination, date, time and number of seats. Once submitted, the ride will be posted and is discoverable. 

- A student looking for a ride types in his starting and ending locations. Matching ride offers by activity and sort by proximity and time are returned by the system. The student may ask to participate in a ride and the student offering the ride gets a list of all the students who 

have requested to join them.The student can ask to join a ride, and the student offering the ride will get notified about the students that have asked to join them. 

- When a ride is confirmed, both parties are sent each other's contact information within the app to coordinate. 

### **4.1.3 Functional Requirements** 

**REQ RS 01:** The system shall allow authenticated students to post ride offers with route, time, and seat details. 

**REQ RS 02:** The system shall match ride seekers to available offers based on route overlap. 

**REQ RS 03:** The system shall send in app notifications to the ride offerer when a join request is made. 

**REQ RS 04:** The system shall allow the offerer to accept or decline requests. 

**REQ RS 05:** The system shall display confirmed ride details to both parties upon acceptance. 

## **4.2 Resource Sharing Module** 

### **4.2.1 Description and Priority** 

This module is a managed space for the exchange of resources related to the academic and everyday life. Users may post notes, textbooks, lab equipment, stationery or any other thing they want to share, lend or sell. This directly tackles the tendency of sending files via random WhatsApp groups that have no organizing, search capability. Priority: High. 

### **4.2.2 Stimulus/Response Sequences** 

- A student clicks on “Post a Resource” and completes the resource type, description, condition, course relevance and free, exchange or for sale information. The listing is reflected in the resource feed. 

- One student is mining resources, refining results by category and/or searching by keyword. Listings that are matched are shown. Student can send an in app message directly to the poster. 

### **4.2.3 Functional Requirements** 

**REQ RES 01:** The system shall allow students to post resource listings with category, description, and exchange type (free/exchange/sale). 

**REQ RES 02:** The system shall support filtering resources by type, course, and availability. 

**REQ RES 03:** The system shall allow students to upload images of resources to their listings. 

**REQ RES 04:** The system shall provide in app messaging between resource poster and interested student. 

**REQ RES 05:** The system shall allow a poster to mark a resource as no longer available. 

## **4.3 Peer Tutoring and Mentorship Module** 

### **4.3.1 Description and Priority** 

The purpose of this module is to link students with a need for academic support or development to students who can provide this support. Any student can become a tutor for certain topics, or a skills mentor for technical and professional subjects, like graphic design, video editing, programming, public speaking or any other practical skill. Juniors and peers can view tutors and skill mentors available for them and request sessions or collaborations. In addition to the subject-specific intervention, the module also facilitates career mentoring for career guidance, internships and career development by senior students, to their juniors. Priority: High. 

### **4.3.2 Stimulus/Response Sequences** 

- A student logs in to Tutoring and Skills, sets up a profile indicating the subjects they can tutor or skills they can provide, their availability, if they will tutor for free or if there will be a small fee, etc. 

- A student looking for assistance in a subject or in a particular skill reviews the tutors and skill mentors available. The system returns a filtered list including profiles. The student initiates a session or collaboration request. Tutor/mentor agrees/offers alternative time. The session is confirmed and students reminded of it. 

- A student who wants to work on a project that requires skills, sends a Collaboration Request with the skills required. Students who are interested in the topic react and a collaboration is started in the module. 

### **4.3.3 Functional Requirements** 

**REQ PT 01:** The system shall allow students to register as tutors with subject expertise and availability details. 

**REQ PT 02:** The system shall allow students to search and filter tutors by subject, year, and availability. 

**REQ PT 03:** The system shall support session request and confirmation flows between tutors and learners. 

**REQ PT 04:** The system shall send reminders to both parties before a scheduled session. 

**REQ PT 05:** The system shall allow students to rate tutors after a completed session. 

## **4.4 Lost and Found Module** 

### **4.4.1 Description and Priority** 

Pupils consistently lose things at school; there is no effective systems in place to address this at present. This module enables students to post found or lost items and include a photo and a description of the location where the item is found which makes it easy for the right person to find and claim the items. Priority: Medium. 

### **4.4.2 Stimulus/Response Sequences** 

- If a student discovers something, he/she takes it to Lost & Found and posts a "Found Item" with a picture, description and location on campus where it was found. 

- A student who has misplaced something looks through the items found or posts a "Lost Item" notice. They get in touch with a finder via the app if a match is identified. 

### **4.4.3 Functional Requirements** 

**REQ LF 01:** The system shall allow students to post lost or found item notices with images and location information. 

**REQ LF 02:** The system shall support keyword search and category filtering of lost and found posts. 

**REQ LF 03:** The system shall allow students to mark an item as claimed or resolved. 

**REQ LF 04:** The system shall notify the poster when someone responds to their listing. 

## **4.5 Digital Library Module** 

### **4.5.1 Description and Priority** 

The digital library is a collection of student projects, research and approved project ideas. It is designed to assist students in discovering ideas from what has already been constructed at LGU, and to prevent students from re-inventing the wheel. Priority: Medium. 

### **4.5.2 Stimulus/Response Sequences** 

- A student who has completed his/her project submits his/her documentation, source code link, and a summary. The submission is added to a queue for review. If approved, it will be displayed in the library. 

- A student wants to find ideas for a project and visits the library and searches by domain, technology or keyword. Summaries and upvote counts are shown for results. The student is able to save a project to their bookmarks. 

### **4.5.3 Functional Requirements** 

**REQ DL 01:** The system shall allow students to upload project documentation with associated metadata such as domain, year, and technology stack. 

**REQ DL 02:** The system shall support keyword and category based search across library entries. 

**REQ DL 03:** The system shall allow students to bookmark and upvote library entries. 

**REQ DL 04:** The system shall include a moderation step before any uploaded project becomes publicly visible. 

## **4.6 Community and Announcements Module** 

### **4.6.1 Description and Priority** 

This module is a place for students to create a study group, add a collaborative discussion thread and share information about events, workshops, or opportunities. This will eliminate the need for personal social media profiles to be used as a channel for announcing their work. Priority: Medium. 

### **4.6.2 Stimulus/Response Sequences** 

- A student creates a study group for a certain subject or project, makes it open or invite only and invites other students to join. Users can leave messages and files in the group. 

- A person sets up an event and publishes an event announcement containing the event date, event location and event registration link. It is sent to interested students in their feed and can be saved or shared. 

### **4.6.3 Functional Requirements** 

**REQ CM 01:** The system shall allow students to create and join study groups with configurable access settings. 

**REQ CM 02:** The system shall support posting, commenting, and file sharing within group spaces. 

**REQ CM 03:** The system shall allow students or authorized users to post campus event announcements. 

**REQ CM 04:** The system shall send push notifications to relevant students when a new announcement is posted. 

## **4.7 Printing Services Module** 

### **4.7.1 Description and Priority** 

Students often require printing services, and often end up having to stand in line at a printing station without any indication of status or advance planning. In this module, students can print their assignments from the app, set preferences and receive a notification when the document is ready to be printed. Priority: Medium. 

### **4.7.2 Stimulus/Response Sequences** 

- A student uploads a document, makes print settings including range, color/black and white, and copies are printed, then submits. The job is put on the queue and a confirmation is sent. 

- The system will notify the student when the print job is ready to be collected with information about the collection. 

### **4.7.3 Functional Requirements** 

**REQ PR 01:** The system shall allow students to upload documents and specify print preferences. 

**REQ PR 02:** The system shall queue print jobs and display real time status to the student. **REQ PR 03:** The system shall notify the student when their print job is ready for collection. 

## **4.8 AI Chatbot Module** 

### **4.8.1 Description and Priority** 

One of the more unique aspects of the system is the AI chatbot. It has been developed using Retrieval Augmented Generation (RAG), which is based on real-world institutional information from the LGU, and can answer specific questions regarding LGU policies, registration procedures, availability of university provided digital tools, courses and project ideas. Priority: High. 

### **4.8.2 Stimulus/Response Sequences** 

- A student initiates the chatbot conversation by typing a question, e.g., "How do I access Microsoft Azure through the university? The chatbot extracts relevant information from the institutional knowledge base and generates a delicious and precise answer. Student questions for clarification may be asked. 

- A student comes up with a list of project ideas that they are interested in machine learning. The Chatbot retrieves past projects from the digital library and generates suggestions based on context. 

### **4.8.3 Functional Requirements** 

**REQ AI 01:** The system shall integrate an AI chatbot accessible from the main navigation. **REQ AI 02:** The chatbot shall use RAG to retrieve answers from an indexed knowledge base of LGU institutional documents. 

**REQ AI 03:** The chatbot shall suggest relevant project ideas based on student specified interests or domains. 

**REQ AI 04:** The chatbot shall acknowledge when it cannot find a reliable answer rather than fabricating a response. 

**REQ AI 05:** The system shall allow the knowledge base to be updated as university documents change. 

# **5. Other Nonfunctional Requirements** 

## **5.1 Performance Requirements** 

The Academic Peer Collaboration and Networking System should be efficient and responsive both in normal and peak situations. The system should be able to handle at least 300-500 users concurrent users at a time without any appreciable degradation in performance. Under normal network conditions, the average action time for users to load dashboards, make a request, or access resources should not be greater than three seconds. Real time applications, like notifications and updates, should be sent in minimum time as it should not interrupt the user. Additionally, the system should be optimized for mobile devices, optimizing loading speed and device resources like battery and memory 

## **5.2 Safety Requirements** 

The system should guarantee the security of the user data and the loss of information caused by system failures or unexpected errors. Data back-up will be performed regularly to ensure user data is stored securely and can be retrieved in case of system crashes or data corruption. It should also be robust to failure, and not lose data when uploaded resources, posts, and tutor session schedules are lost. Concurrently, more should be done to make sure that the platform is utilized correctly, and not for sharing inappropriate content or inaccurate information. The system should offer a reliable and secure environment for all system users that guarantees that data will not be corrupted and that there will be no failure in the system level. 

## **5.3 Security Requirements** 

Security is one of the most critical needs of the system as it is dealing with confidential information about the institution and information of the users. The system will employ secure authentication system, such as e-mail verification, to make sure that only eligible students can access the site. Some features will be limited (where appropriate) and access controlled by role based access control. The mobile app will also incorporate secure communication methods such as HTTPS, which will ensure that data is sent securely to the server, safeguarding against any potential vulnerabilities. Data stored with the database will be protected by appropriate access control and 

encryption. Moreover, the system will feature validation and secure APIs, and regular monitoring, to detect and block common security breaches, such as unauthorized access and data leaks. 

## **5.4 Software Quality Attributes** 

Perhaps the most crucial quality attribute is usability of this system. When students can't get good use out of the app or it responds slowly, going back to WhatsApp groups will be simple. The interface should be clean and easy to use enough for a new user to be able to use the basic features of the program without looking at any documentation. On screen guidance and/or tooltips should be used to cover edge cases. Reliability is also a major factor. The App should always be available when the University is open. Target up time is acceptable that is 99% for deployment 1. In app maintenance notifications should be sent in advance for any scheduled maintenance. Maintainability is also vital as the build team will pass this over when the FYP is finished. The code should be well commented, organized, be well structured with modules and also be of good code quality such that the future developers are able to add, modify or remove features without disturbing the existing functionality. Portability, which is mostly due to React Native's cross platform capabilities (via Expo), means that the app will not require to be re-written for various mobile platforms. It is easily extensible using Django's stable backend and the integration of the PostgreSQL, which can process many data pieces. 

## **5.5 Business Rules** 

The platform is open for securing enrollment only for currently enrolled students of Lahore Garrison University. Verification is linked to the institutional email, and accounts corresponding to deactivated emails (due to graduation or withdrawal) will also be deactivated. Students can include resources for sale but no money is exchanged in the system. Offline student to student payments are at student's discretion. The platform is not responsible for the conditiosale,d exchange value of the items listed. Anyone can report a listing, post or user profile. Reports are considered and followed up in line with an internal moderation guideline. With repeated violations, there is a temporary ban or permanent ban on the account. All users of the platform can view the content when approved and added to the digital library. Contributors retain credit for their work, but their project will be referenced and viewed by other LGU students by uploading. 



<!-- Start of picture text -->
I --- eeees '<br>a — !<br>t 1<br>AL Registerand Loginwhih LOU Exalt 2 I<br>| fo ——$—_—_—<br>1f ——-.. F<br>Lee Post and Scarct lide Overs ,<br>Y /-—_ _-—--" I<br>iol oo —_—_-_-”: 1<br>¢oF ane Requestto Join a ick —_ -_ 1I<br>rnfl ee 1<br>a fog “ a Oe _ > i<br>f  /ra ZL Oe SEBrest amd Browse Resource Visiting —_—_ _ 2 F1<br>ff Le a ee a<br>ff # ——— —_——.. 1<br>if I AC inital Ricard? Boater 2) 1<br>of o# ee ——“-—- 1<br>ff ff Le — 1<br>ff “ a wl ne — ee i]<br>ffef Oe a wk Tepisieras Tater ar Sich Wendur J 1<br>ffa ao ata we Sesinned !F<br>fffMee, J“ wea aa peo|I a—_——_—— Search and Ibequesd Totering Sessions——eej !<br>LeMeeJe eeeea_— _--4t_ —ee Hate a Tutor - ae_~Si 'I<br>fee | ee !<br>oe —_———_— oo !<br>—— _ Cc Burd Laest<br>eee I ar Foam Men _ }<br>Student TERRTe,Remen,ae wa ~F || oa_—a eeSearcha Lost amc bound Listings —__ ae2 1i]1<br>Primary, RAsoe  aemy, we ed Weee 1I<br>~haaeoNoe YONON,* Ma,ha CeeaUptoad Project da Digitala Litanya a3 ''<br>SSON we a*, ~ s W 7 '<br>ON N aa C Search Digital Library — '<br>aNyoOS ~ he,bos, * —_—————SS ~ __ — i!<br>OS ! ~C Create and dedn Study Groups BD !<br>WACK __ i<br>SoM!ONSON 4 NT— Bos Anmauriernerels _ B I11<br>a '<br>NOMISOMy ws —_——— oo. !1<br>an a aoe Submit Print.tob Jy<br>Soy‘, , — ___ 1<br>‘ Oe !<br>sy Co Trawte Primi dus Siadves _ '<br>ro ee —_ !<br>Po — ———— I<br>I\ ‘yoMo ‘Char with Al Chatho __7 }<br>\ — rs I<br>I a i ee, I<br>I C Moreraue Ddebial Library Subnnlsshons ' an<br>! ee el ah<br>| sinctudies lo<br>— = a me<br>I a Mamitor Sayan Porter I B I —<br>I Oh ae<br>| SS eo a<br>C Update Al Knowiedas Base Yr<br>| ee i System Actmin f<br>\ , Developer (Beoenearyy<br>Nee ee ee ee ee ee eee ee ee ee eee eee ee ee ee eee<br><!-- End of picture text -->



<!-- Start of picture text -->
"tutors"<br>“has requests": RIDE_OFFERS<br>RIDE_REQUESTS mee!ide_id PK aint<br>requestid PK — int user_id FK int .<br>ride_id= FK 7 int, destinationsource stringstring<br>requester_id FK int 7 .<br>status string. offers date. date.<br>time string<br>"makes (as requester)" seats int<br>( TUTOR_PROFILES ; RESOURCES<br>tutor_id PK int resource_id |<br>A A PK<br>expertiseuser_id FK intstring WSS|  AK ;int<br>availability string category string<br>has {1:1}" "owns" description string<br>availability string<br>“rpceives"<br>"gives (; “attends<br>RATINGS od “rr ee ee user_id PK USERSint student)"(as O<€ TUTORING_SESSIONS<br>rating_id PK int name string session_id PK int<br>tutor_id FK int email string tutor_id FK int<br>student_id FK int password string student_id FK int<br>score int department string date date<br>feedback string “uploads” year int A, creates" . status string<br>DIGITAL_LIBRARY role string “creates (as| creator)"| LOST_FOUND_POSTS<br>project_id PK int post_id PK int<br>user_id FK int user_id FK int<br>title string item_name string<br>technology_stackdomain stringstring. anes “authors" typelocation stringstring.<br>“submits” status string<br>COMMUNITY_POSTS “has posts” LaSTUDY_GROUPS<br>P jost_it_id PK intin<br>. . group_id PK int<br>group_id FK int<br>contentuser_i=Para mnstring; ‘group_namecreator_id FK stringint .<br>PRINT_REQUESTS<br>CHATBOT_QUERIES puna int<br>query_id PK int user_id FK int<br>user_id FK int document_name string<br>question string print_type string<br>response string SEE string<br>timestamp datetime<br><!-- End of picture text -->



<!-- Start of picture text -->
|- Cross-platform React Native (Expo) mobile application App<br>'25GS *¢<br>HTTPS REST API<br>Django REST API Backend<br>NS_ Microservice handlers<br>58>=<br>eS<br>Persistence & Knowledge<br>PostgreSQL Database + RAG Knowledge Base<br>°<br>23% PostgreSQL Database RAG Knowledge Base<br>ef Hosting & External Services<br>Ey 2 Cloud-managed runtime and third-party integrations<br><!-- End of picture text -->



<!-- Start of picture text -->
tee eT tee try<br>ae cha<br>-s=a #elISame tulperg | tot Beet<br><!-- End of picture text -->



<!-- Start of picture text -->
Lost & Found<br>PostgreSQL Users Resources Tutors Records<br>Community Rides Print Library Notifications<br>Posts Requests Content<br>‘i on te a ounce<br>User - API |<br>Interface Gateway a KnowledgeBase<br>Authentication Aumvenicatio<br>(Login/Register) ervice py<br>Retrieval<br>Engine<br>User<br>Dechboard Management<br>asnpoar Service<br>GEE Large<br>Sharing ManagementRide ModelLanguage(LLM)<br>Service<br>ResourceSharing ManagementResource<br>Service Response<br>Generator<br>Peer<br>Tutoring Tutoring<br>Service<br>Lost &<br>Lost & Found<br>Service<br>Digital<br>Library Email<br>Library Veilteaied<br>Service Service<br>Community<br>Community<br>Service<br>Push<br>Notification<br>a Service<br>Printing<br>Service<br>Al Chatbot<br>Interface<br>Notification<br>Service Cloud Storage<br>Service<br><!-- End of picture text -->



<!-- Start of picture text -->
| Student Submits Session Request<br>Requested<br>| System Notifies Tutor<br>Pending<br>Confirmation<br>Tutor Declines or<br>No Response<br>[within 24 Hours]<br>Tutor Accepts Request<br>System Sends Reminder<br>Before Session<br>Student or Tutor<br>Cancels Before<br>Session<br>Reminder<br>Sent<br>Session Time Passes &<br>Both Parties Attended<br>Completed<br>| Student Submits Rating<br><!-- End of picture text -->



<!-- Start of picture text -->
RideOffer<br>+ridelD<br>+source<br>+date<br>+time +resourcelD<br>+availableSeats +category<br>+description<br>+createRide() +availability<br>+updateRide()<br>+addResource()<br>+updateResource()<br>RideRequest<br>see manages utoringSession<br>+sendRequest() +session|ID<br>+acceptRequest() +schedule<br>+rejectRequest() +status<br>creates +requestSession()<br>TutorProfile +confirmSession()<br>+tutorID<br>send +expertise participates LostFoundPost<br>+availability<br>+postID<br>+createProfile() +itemName<br>+location<br>+status<br>creates<br>+createPost()<br>So; +resolvePost()<br>creates<br>Student<br>+studentID OS DigitalLibraryProject<br>Oo +nameemail Oo ace.<br>| +password+department o,Y upload: *gomaind .<br>+year O +technologyStack<br>(— +register() Q +uploadProject()<br>+login()<br>| gs o, +bookmarkProject()<br>+updateProfile() joins<br>| © StudyGroup<br>| submits ; +groupID<br>l gives +groupName<br>| +requestID creates +createGroup()+joinGroup()<br>| +document<br>interacts | +printType<br>|_| *status |Rating|<br>| +submitRequest()}. +score+ratingID<br>| +feedback<br>ICommunityPost|<br>+receiveQuery()<br>+generateResponse() +postID<br>+content<br>+createPost()<br>+comment()<br><!-- End of picture text -->



<!-- Start of picture text -->
Authentication | ____.-----.--yeton —es —— =a<br>Login Credentials<br>H t Read/ Write<br>''<br>; ¥<br>; PS<br>ao Povo Sesston!anToken| PeerResourceTutoring& fend / Write eeeec. — Rides& Resources DB<br>LosFoundtBrary Submicions& -| [a<br>Nanaalvere Language‘ > Read / Write —LEai > Uprary & Community DB<br>Commmunty Post - Chatbot<br>EE<br>Policy Document &<br>‘Search tor Tutorby Subject<br>(GET Autors Taubject=.<br>Query Tutays Tati<br>ie. _ Diels<br>Fibered Tutor Profs<br>Disgiliny Teter List<br>Send Seino Request<br>POST feemsionsirecuest<br>Sue Pending Saesion<br>Accept Boscicn<br>PUT seessioneitidyicontinn<br>Update Session Status to Centireed<br>Rornircdket Nethcaton<br><!-- End of picture text -->



<!-- Start of picture text -->
RISE OFFER.<br>ride offer ct PK int<br>cwmes_student_id<br>re int<br>origin string<br>cestinaticen string<br>cepaanlune time da.etne<br>seats evellable Int<br>notes string<br>crested_at dae<br>RESOURCE LISTING<br>resource ci PK int<br>studenticFK int<br>tie: string<br>category ‘string<br>url string<br>deseription “string<br>crested at dace<br>"eramas®<br>TUTOR PROFILE<br>Re rote int<br>slidenlidFK int<br>sublec:s string<br>oeatinie biovvailability st rinin g<br>houry rate decimal<br>“owns<br>LOST_FOUND_POSsT<br>postid PK Int<br>student_o FK int<br>type sting “recelves"<br>tite string<br>description string<br>crater location string<br>[ crested _at dace<br>GROUP_ MEMBER ad" STUBY GROUP L STUOENT DISITAL_LIBRARY_PROJECT<br>qroup_member_id Ces ke Letters ia OK lint uplosds'y_, Projecta PIE BS<br>ber im creator studant i i in aa studentic FK ‘int<br>ee . FK a titles sing<br>scudertid et tienes sting university EMA cing summery “string<br>sae Fx Im string UK ar string<br>role pastring ened mien! “eresaal datesstring aecreatedat andale —crested at “stringdae<br>COMMUNITY OST ol PRINT_REQUEST<br>communityPK  posid . ee prinoequestidFx |<br>groupauther_sturentia Id FX  FK intim | |a studentdocumpr:name lo FK intstring<br>sitle string ohahaae pages int<br>creptiedLatcontent darstring | | colorstatus:subinitted_atmode stringstringdace<br>[ CHAIBOTOUERY<br>que yid PK int<br>studenid #K int<br>«porticipsten’ que’y_text string<br>response tex: string<br>—_ rreauted patRIDE_REQUESTdin<br>ride_requestid PK int<br>tidelofferidFK int<br>coro nt<br>sites string<br>feqvested_st dace<br>SESSION_FARTICIPANT ad‘nae sessionidTUTORING PK tSESSION<br>sester_panticipant_id P& |int topic string<br>sessionld T< int Sartime catetime<br>stusientLid FK int encLtima catetima<br>toe string lociian string<br>notes ating<br><!-- End of picture text -->

# **References** 

- [1] K. J. Topping, “The effectiveness of peer tutoring in further and higher education: A typology and review of the literature,” _High. Educ. (Dordr)._ , vol. 32, no. 3, pp. 321–345, Oct. 1996, doi: 10.1007/BF00138870. 

- [2] R. Salhab and W. Daher, “University Students’ Engagement in Mobile Learning,” _Eur. J. Investig. Health Psychol. Educ._ , vol. 13, no. 1, pp. 202–216, Jan. 2023, doi: 10.3390/ejihpe13010016. 

- [3] J. M. Romero-Saritama, S. Espinosa-Tapia, and A. Palacios-Rodríguez, “Using WhatsApp in Distance Education: Assessing the Impact on Academic Interaction and Influencing Factors,” _Soc. Sci._ , vol. 14, no. 3, p. 183, Mar. 2025, doi: 10.3390/socsci14030183. 

- [4] A. Blilat and A. Ibriz, “Design and Implementation of P2P Based Mobile App for Collaborative Learning in Higher Education,” _International Journal of Interactive Mobile Technologies (iJIM)_ , vol. 14, no. 07, p. 115, May 2020, doi: 10.3991/ijim.v14i07.13167. 

