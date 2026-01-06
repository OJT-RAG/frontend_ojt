// Shared mock jobs data for JobList and JobDetail
export const JOBS = [
  {
    id: 1,
    company: 'Alpha Tech',
    logo: null,
    industry: 'SE',
    title: 'Frontend Intern',
    difficulty: 'Medium',
    salary: '$250',
    location: 'Hanoi',
    createdAt: '2025-11-01',
    description: 'Work with the UI engineering team to build accessible, responsive interfaces using React and modern tooling.',
    requirements: [
      'Basic knowledge of HTML, CSS, JavaScript',
      'Familiar with React components & hooks',
      'Team communication skills',
      'Eagerness to learn and adapt'
    ],
    benefits: [
      'Monthly allowance',
      'Mentor pairing',
      'Hands-on project experience',
      'Certification on completion'
    ],
    levels: [
      { level: 'Intern', openings: 3 },
      { level: 'Fresher', openings: 1 }
    ]
  },
  {
    id: 2,
    company: 'Beta Vision',
    logo: null,
    industry: 'FE',
    title: 'UI Prototype Intern',
    difficulty: 'Easy',
    salary: '$220',
    location: 'Da Nang',
    createdAt: '2025-11-06',
    description: 'Assist product designers converting wireframes into interactive prototypes; collaborate closely with design lead.',
    requirements: [
      'Figma or similar tool basics',
      'Understanding of user-centered design',
      'Clear communication',
      'Attention to visual detail'
    ],
    benefits: ['Design workshops', 'Allowance', 'Portfolio review'],
    levels: [{ level: 'Intern', openings: 2 }]
  },
  {
    id: 3,
    company: 'Creative Grid',
    logo: null,
    industry: 'GD',
    title: 'Graphic Design Intern',
    difficulty: 'Medium',
    salary: '$230',
    location: 'HCMC',
    createdAt: '2025-11-05',
    description: 'Support marketing team with digital asset creation (social banners, simple motion graphics).',
    requirements: ['Photoshop basic', 'Illustrator basic', 'Color sense', 'Collaborative mindset'],
    benefits: ['Brand style training', 'Allowance'],
    levels: [{ level: 'Intern', openings: 2 }]
  },
  {
    id: 4,
    company: 'Insight Bank',
    logo: null,
    industry: 'IB',
    title: 'Investment Research Intern',
    difficulty: 'Hard',
    salary: '$300',
    location: 'Hanoi',
    createdAt: '2025-10-28',
    description: 'Analyze market trends, prepare brief research summaries and assist senior analysts.',
    requirements: ['Excel basics', 'Analytical thinking', 'English reading skills', 'Finance interest'],
    benefits: ['Professional mentorship', 'Allowance'],
    levels: [{ level: 'Intern', openings: 2 }, { level: 'Junior', openings: 1 }]
  },
  {
    id: 5,
    company: 'Scale Systems',
    logo: null,
    industry: 'SE',
    title: 'Backend Intern',
    difficulty: 'Hard',
    salary: '$320',
    location: 'Remote',
    createdAt: '2025-11-04',
    description: 'Help implement microservice endpoints, write unit tests and improve monitoring dashboards.',
    requirements: ['Basic Node.js', 'REST principles', 'Git workflow', 'Problem solving'],
    benefits: ['Remote flexibility', 'Allowance', 'Code reviews'],
    levels: [{ level: 'Intern', openings: 3 }]
  },
  {
    id: 6,
    company: 'Pixel Forge',
    logo: null,
    industry: 'GD',
    title: 'Visual Design Intern',
    difficulty: 'Easy',
    salary: '$200',
    location: 'HCMC',
    createdAt: '2025-11-02',
    description: 'Produce simple UI illustrations and iconography under guidance of senior designer.',
    requirements: ['Vector drawing basics', 'File organization discipline'],
    benefits: ['Allowance', 'Design critique sessions'],
    levels: [{ level: 'Intern', openings: 2 }]
  }
];
