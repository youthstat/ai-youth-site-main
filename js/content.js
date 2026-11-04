/* =====================================================================
   content.js — THE ONLY PLACE TO EDIT TEXTS, LINKS, VIDEO IDs AND NUMBERS
   Loaded as a plain script (window.SITE_DATA) so it also works on file://
   The site is a report, so texts are written in the past tense.
   ===================================================================== */
window.SITE_DATA = {

  /* ========== 1. EVENT ========== */
  event: {
    title: "AI and Young People: Balancing Technology and Humanity",
    subtitle: "Erasmus+ Youth Exchange",
    dates: "25 August – 2 September 2026",
    place: "Vatra Dornei, Romania",
    description:
      "The project equipped young people with critical thinking, the ethical use of AI and the ability to recognise disinformation.",
    organizer: "Asociatia Bradul, Muntele si Neagra"
  },

  /* ========== 2. ABOUT THE PROJECT ========== */
  about: {
    lead: "Young people who moved beyond simply using AI and started questioning, understanding and shaping its role in society.",
    paragraphs: [
      "Artificial Intelligence is transforming the way we learn, communicate and make decisions. “AI and Young People” empowered young people to move beyond simply using AI and to question, understand and shape its role in society.",
      "Through non-formal education, intercultural learning and hands-on experiences, participants strengthened their digital literacy, tackled misinformation and explored how to use technology in an ethical and responsible way.",
      "The project was an Erasmus+ international youth exchange with partners from six countries. Participants learned, questioned and grew while connecting with peers from across Europe and beyond."
    ],
    erasmusTitle: "Made possible by Erasmus+",
    erasmusText:
      "The exchange was carried out with the support of the Erasmus+ programme of the European Union, which makes it possible for young people from different countries to meet and learn together through non-formal education.",
    facts: [
      { icon: "📅", label: "Duration", value: "9 days: 2 travel days and 7 activity days" },
      { icon: "🗓️", label: "Dates", value: "25 August – 2 September 2026" },
      { icon: "👥", label: "Group", value: "6 participants (aged 18–30) and 1 youth leader from each of the 6 countries" },
      { icon: "📍", label: "Place", value: "Vatra Dornei, a small mountain resort in the Carpathian Mountains of Northern Romania" },
      { icon: "🏡", label: "Venue", value: "A guesthouse on the outskirts of the town, close to nature, with traditional Romanian food" },
      { icon: "🚌", label: "Travel", value: "The group met in Cluj-Napoca and travelled by bus to Vatra Dornei" },
      { icon: "🎭", label: "Cultural evening", value: "Every team presented its country in a creative way" }
    ]
  },
  // done:true shows a green tick
  goals: [
    { title: "Detected AI disinformation", text: "Trained 42 participants to detect AI-generated disinformation.", done: true },
    { title: "Local initiatives", text: "Ran 6 local initiatives that reached 211 people (goal: more than 200).", done: true },
    { title: "AI Literacy Toolkit", text: "Created the “AI Literacy Toolkit”.", done: true },
    { title: "AI & Youth Ambassadors Network", text: "Established the “AI & Youth Ambassadors Network”. This website is the network.", done: true }
  ],

  /* ========== 3. PLANNED vs ACHIEVED ========== */
  progress: [
    { label: "Participants", value: 42, target: 42, text: "42 / 42" },
    { label: "Local initiatives", value: 6, target: 6, text: "6 / 6" },
    { label: "People reached", value: 211, target: 200, text: "211 (goal 200+)" },
    { label: "AI Literacy Toolkit", done: true, text: "Created" },
    { label: "AI & Youth Ambassadors Network", done: true, text: "Founded: this website" }
  ],

  /* ========== 4. PROGRAMME (7 DAYS) ========== */
  // date: activity days ran from 26 August to 1 September (25 Aug and 2 Sep were travel days)
  // youtube: 11-character video ID (the part after v=). Empty = video block hidden.
  // photos: optional manual list, e.g. ["a.jpg","b.jpg"]; otherwise photo-1.jpg, photo-2.jpg... are auto-detected.
  days: [
    {
      id: 1, date: "26 August", title: "Ice-Breaking & Group Agreement", countries: [], icon: "🧭",
      description: "We got to know each other, learned about the project, agreed on the rules together and tried Mission Impossible: AI edition.",
      activities: ["Ice-breaking and getting to know each other", "Intro to the project & Code of Conduct", "Fears & expectations, learning agreement", "Mission Impossible: AI edition", "Speed dating"],
      youtube: "", photoFolder: "images/days/day1/", photoMax: 30
    },
    {
      id: 2, date: "27 August", title: "AI Detective & AI Boundaries", countries: ["Romania", "Moldova"], icon: "🕵️",
      description: "We investigated AI together, discussed where its boundaries should be and shared our cultures on the first Cultural Night.",
      activities: ["AI Detective (investigate your buddy)", "AI corners", "World Café: AI boundaries (laws created by country)", "AI community", "Cultural Night: Romania, Moldova"],
      youtube: "", photoFolder: "images/days/day2/", photoMax: 30
    },
    {
      id: 3, date: "28 August", title: "Fake News & Algorithmic Bias", countries: ["Ukraine", "Poland"], icon: "📰",
      description: "We investigated fake news, looked at AI in our own countries and held a court role-play on algorithmic bias.",
      activities: ["Fake News Investigation", "AI in your country", "Role-play on algorithmic bias (court)", "Cultural Night: Ukraine, Poland"],
      youtube: "", photoFolder: "images/days/day3/", photoMax: 30
    },
    {
      id: 4, date: "29 August", title: "Study Visit & Cultural Night", countries: ["Jordan", "Georgia"], icon: "🚌",
      description: "We went on a study visit, reflected on the day and shared Jordan and Georgia on the Cultural Night.",
      activities: ["Study visit", "Reflection", "Cultural Night: Jordan, Georgia"],
      youtube: "", photoFolder: "images/days/day4/", photoMax: 30
    },
    {
      id: 5, date: "30 August", title: "AI Literacy Toolkit & Videos", countries: [], icon: "🧰",
      description: "We created the AI Literacy Toolkit and the educational videos, and presented the videos to the group.",
      activities: ["AI Literacy Toolkit creation", "Video materials creation", "Video material presentation", "Oscar night"],
      youtube: "", photoFolder: "images/days/day5/", photoMax: 30
    },
    {
      id: 6, date: "31 August", title: "Trip & Rest Day", countries: [], icon: "🏞️",
      description: "We went on a trip together, then reflected on the week and had time to socialise and rest.",
      activities: ["Trip", "Reflection", "Socialising / rest"],
      youtube: "", photoFolder: "images/days/day6/", photoMax: 30
    },
    {
      id: 7, date: "1 September", title: "Follow-up, Evaluation & Farewell", countries: [], icon: "🎉",
      description: "We talked about Erasmus+ and Youthpass, planned the follow-up, evaluated the exchange and said goodbye at the farewell party.",
      activities: ["Erasmus+ & Youthpass", "Follow-up & dissemination strategy", "Reflect & Grow: final evaluation", "Final feedback and reflections", "Farewell party"],
      youtube: "", photoFolder: "images/days/day7/", photoMax: 30
    }
  ],

  /* ========== 5. PARTICIPANTS & INCLUSION ========== */
  participants: {
    total: 42,
    youth: 36,
    leaders: 6,
    ageRange: "18–30",
    perCountry: "6 participants and 1 youth leader",
    countries: ["Romania", "Poland", "Ukraine", "Georgia", "Moldova", "Jordan"],
    fewerOpportunities: {
      percent: 50,
      people: 21,
      text: "At least 50% (21 people) were young people with fewer opportunities: economic, geographical and social barriers, including internally displaced people from Ukraine."
    }
  },
  competences: [
    { icon: "🧠", title: "Critical thinking" },
    { icon: "💻", title: "Digital literacy" },
    { icon: "🤝", title: "Intercultural dialogue" },
    { icon: "⚖️", title: "Ethical reasoning" }
  ],
  youthpassText: "Learning outcomes were recognised through Youthpass.",

  /* ========== 6. IMPACT DASHBOARD ========== */
  stats: [
    { value: 42, label: "Participants & leaders" },
    { value: 211, label: "People reached by local initiatives" },
    { value: 6, label: "Countries" },
    { value: 6, label: "Educational videos" },
    { value: 900, label: "Social media views (Poland)" },
    { value: 20, suffix: "+", label: "Posts by participants" }
  ],
  downloadsCard: { label: "AI Literacy Toolkit downloads", target: 1200, targetText: "Target: 1200+" },

 /* ========== 7. LOCAL IMPACT ACROSS EUROPE ========== */
  localIntro:
    "After the exchange, every national team took the project home. Between 16 September and 20 October 2026 the teams ran nine local events in six countries. About 259 young people took part. Every partner organisation also published a post on its own channels, and participants shared the results on social media.",
  countries: [
    {
      id: "romania", name: "Romania", flag: "🇷🇴", people: 55,
      postUrl: "https://www.instagram.com/p/DbneSvROYxB/",
      events: [
        { place: "AHA Center, Bucharest", people: 30,
          text: "About 30 NGO volunteers, youth workers, students and trainers took part. The team presented the toolkit and the participant videos. A discussion followed on AI ethics, over-use and how to make AI safer and more inclusive for vulnerable young people." },
        { place: "Faculty of Forestry, Ștefan cel Mare University, Suceava", people: 25,
          text: "About 25 students of the Faculty of Forestry took part. The team presented the toolkit and the videos and discussed safe and inclusive use of AI." }
      ],
      youtube: "", photoFolder: "images/countries/romania/", photoMax: 30
    },
    {
      id: "moldova", name: "Moldova", flag: "🇲🇩", people: 50,
      postUrl: "https://www.instagram.com/p/DdRdnrIjQtY/",
      events: [
        { place: "Prometeu-ProTalent Theoretical Lyceum, Chișinău", people: 50,
          text: "JEF Moldova presented the exchange to 50 students. The session covered debates on AI, critical thinking and intercultural learning. It also introduced Erasmus+ youth exchanges, training courses, the European Solidarity Corps and summer schools." }
      ],
      youtube: "", photoFolder: "images/countries/moldova/", photoMax: 30
    },
    {
      id: "jordan", name: "Jordan", flag: "🇯🇴", people: 30,
      postUrl: "",
      events: [
        { place: "SYL Office, Amman", people: 30,
          text: "University students and young professionals took part in three activities from the exchange: Poster Rotation (4 groups), the “Real or Fake Challenge: AI Edition” (Fake News Quiz) and the debate “Agree, Disagree, or In Between”. The team also screened the winning film from Oscar Night." }
      ],
      youtube: "", photoFolder: "images/countries/jordan/", photoMax: 30
    },
    {
      id: "ukraine", name: "Ukraine", flag: "🇺🇦", people: 41,
      postUrl: "https://www.instagram.com/p/Ddgew-uDi37/",
      events: [
        { place: "Shelter of T.H. Shevchenko National University “Chernihiv Colehium”", people: 13,
          text: "Andrii presented the project to 13 students and teachers. The info session covered Erasmus+ youth exchanges, trainings, volunteering and how to write a strong application. He also shared his own experience from Vatra Dornei. The Faculty of Philology published a post about the session." },
        { place: "Youth Centre, Lviv", people: 28,
          text: "Twenty-eight young people took part in a session led by Diana, with a focus on cybersecurity." }
      ],
      youtube: "", photoFolder: "images/countries/ukraine/", photoMax: 30
    },
    {
      id: "georgia", name: "Georgia", flag: "🇬🇪", people: 50,
      postUrl: "",
      events: [
        { place: "Public School No. 55, Tbilisi (Vake)", people: 50,
          text: "11th-grade students learned about Erasmus+, youth exchanges, how to apply and the benefits of taking part. The team showed photos from Vatra Dornei and answered questions. Seven participants also posted about the exchange in the Youth For The World Facebook group." }
      ],
      youtube: "", photoFolder: "images/countries/georgia/", photoMax: 30
    },
    {
      id: "poland", name: "Poland", flag: "🇵🇱", people: 33,
      postUrl: "https://www.instagram.com/p/Ddt94dggJUT/",
      events: [
        { place: "Online meetup, 20.09.2026", people: 11,
          text: "Eleven people joined an online meeting with slides, a film and personal stories about what Erasmus+ offers." },
        { place: "Unplugged: AI Under the Open Sky (offline, open-air event), 17.10.2026", people: 22,
          text: "Twenty-two people met outdoors for an offline event. The unplugged format fitted the topic of balancing technology and humanity. Five participants also published posts on Facebook and Reddit." }
      ],
      youtube: "", photoFolder: "images/countries/poland/", photoMax: 30
    }
  ],
${c.postUrl ? `<a class="btn" href="${c.postUrl}" target="_blank" rel="noopener noreferrer">View post ↗</a>` : ""}
  /* ========== 8. GALLERY ========== */
  gallery: { folder: "images/gallery/", photoMax: 60 },

  /* ========== 9. VIDEOS ========== */
  // youtube: 11-character video ID or a full link (watch / youtu.be / shorts). Empty = "Coming soon" card.
  // format: "short" = vertical 9:16 video; leave out for normal 16:9 videos.
  videos: [
    { title: "Satalana", youtube: "5wi6rBr9bAI" },
    { title: "Son Șans, The Last Chance", youtube: "uPIBVGhg9t8" },
    { title: "Life Without AI: Back to Reality", youtube: "R1HsZIn1kZc" },
    { title: "404: Truth Not Found", youtube: "dK5HrWnF_7M" },
    // vertical video (YouTube Shorts): format "short" shows it in a tall 9:16 frame next to the others
    { title: "She", youtube: "n00DWmTaV2Y", format: "short" },
    { title: "Future With AI", youtube: "tneI0Ay-AcI", format: "short" }
  ],

  /* ========== 10. AI & YOUTH AMBASSADORS NETWORK (this website) ========== */
  network: {
    title: "AI & Youth Ambassadors Network",
    lead:
      "Establishing the AI & Youth Ambassadors Network was one of the objectives of the project. This website is that network: a long-term, open space where every participant can find what we learned, what we created and how to carry it forward.",
    helpTitle: "How ambassadors can use this site",
    // link: "infopack" | "brochure" | "#section-id"
    help: [
      { icon: "🧰", title: "Use the AI Literacy Toolkit",
        text: "A free toolkit for young people and youth workers on critical and ethical use of AI.",
        link: "brochure", buttonText: "Download the toolkit" },
      { icon: "📖", title: "Read the Infopack",
        text: "More detailed information about the project for participants.",
        link: "infopack", buttonText: "Open Infopack" },
      { icon: "🗓️", title: "Reuse the programme",
        text: "Revisit the seven days and their activities, such as the AI Detective, the World Café on AI boundaries or the algorithmic bias court role-play, as ideas for your own sessions.",
        link: "#programme", buttonText: "See the programme" },
      { icon: "🎬", title: "Share the educational videos",
        text: "Short videos created by participants during the exchange.",
        link: "#videos", buttonText: "Watch videos" },
      { icon: "🌍", title: "Get ideas from local events",
        text: "See how each national team brought the project to its own community.",
        link: "#local-impact", buttonText: "See local events" }
    ],
    nextTitle: "What we will continue to do",
    next: [
      "We will keep the AI & Youth Ambassadors Network active and open to every participant.",
      "We will keep sharing the AI Literacy Toolkit with young people and youth workers.",
      "We are planning a new Erasmus+ project for 2027."
    ]
  },

  /* ========== 11. PARTNERS & CONTACTS ========== */
  // To show a logo instead of the name: put the file in images/logos/ and add logo:"images/logos/partner-xxx.png"
  partners: [
    { name: "BMN", logo: "images/logos/partner-bmn.png", url: "https://www.instagram.com/bmnngo" },
    { name: "SEMINARIUM", logo: "images/logos/partner-seminarium.png" },
    { name: "JEF Moldova", logo: "images/logos/partner-jef-moldova.png", url: "https://www.instagram.com/jef_moldova" },
    { name: "Informational Hub", logo: "images/logos/partner-info-hub.png", url: "https://www.instagram.com/ngo_informhub" },
    { name: "AL-EMAD ALKABEER", logo: "images/logos/partner-al-emad-alkabeer.png", url: "https://www.instagram.com/support_youth_leaders" },
    { name: "Impact Makers", logo: "images/logos/partner-impact-makers.png", url: "https://www.instagram.com/impactmakers_pl" }
  ],
  contactsLead: "If you have any questions, feel free to reach out.",
  contacts: [
    { name: "Adrian Cocardan", email: "meisxmaster@yahoo.com", phone: "+40748213791", phoneText: "+40 748 213 791" },
    { name: "Paul Iordache", email: "bmnngo2@gmail.com", phone: "+40756601982", phoneText: "+40 756 601 982" }
  ],

  /* ========== 12. LINKS, FOOTER, DOWNLOAD COUNTER ========== */
  links: {
    infopack: "https://sites.google.com/view/aiandyouth/home",
    brochure: "https://drive.google.com/file/d/1j0MdfLUfwN6dMbW9DIIIq_Fk-o2LgV96/view"
  },
  footer: {
    disclaimer:
      "Funded by the European Union. Views and opinions expressed are however those of the author(s) only and do not necessarily reflect those of the European Union or the European Education and Culture Executive Agency (EACEA). Neither the European Union nor EACEA can be held responsible for them."
  },
  // firebaseUrl example: "https://your-project-default-rtdb.europe-west1.firebasedatabase.app"  (no trailing slash)
  // Empty = fallback mode (counter visible only in the current browser).
  downloads: { startValue: 378, firebaseUrl: "" }
};
