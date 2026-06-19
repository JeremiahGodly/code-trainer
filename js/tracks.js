/**
 * GhostCode AI — Learning Track Definitions
 *
 * Each track contains:
 *  - id:          unique identifier used for localStorage keys
 *  - name:        display name
 *  - icon:        emoji icon
 *  - desc:        short description of technologies covered
 *  - defaultRepo: "owner/repo" for the default training repository
 *  - branch:      default branch name (app will also try the other of main/master)
 *
 * Users can override the repository URL in the repo config modal.
 * All repos listed here are well-known, public, and suitable for
 * character-by-character typing practice.
 */

const TRACKS = [
  {
    id:          'fullstack',
    name:        'Full Stack Web Dev',
    icon:        '🌐',
    desc:        'HTML · CSS · JavaScript · Node.js',
    defaultRepo: 'bradtraversy/vanillawebprojects',
    branch:      'master',
  },
  {
    id:          'frontend',
    name:        'Frontend Development',
    icon:        '🎨',
    desc:        'HTML · CSS · Responsive UI',
    defaultRepo: 'wesbos/JavaScript30',
    branch:      'master',
  },
  {
    id:          'backend',
    name:        'Backend Development',
    icon:        '⚙️',
    desc:        'Node.js · Express · REST APIs',
    defaultRepo: 'expressjs/express',
    branch:      'master',
  },
  {
    id:          'mobile',
    name:        'Mobile App Development',
    icon:        '📱',
    desc:        'React Native · Mobile UI',
    defaultRepo: 'react-native-community/hooks',
    branch:      'main',
  },
  {
    id:          'hacking',
    name:        'Ethical Hacking',
    icon:        '🔐',
    desc:        'Vulnerability Testing · Pentesting',
    defaultRepo: 'OWASP/NodeGoat',
    branch:      'master',
  },
  {
    id:          'cybersec',
    name:        'Cybersecurity Dev',
    icon:        '🛡️',
    desc:        'Security Tools · Defense Code',
    defaultRepo: 'threat9/routersploit',
    branch:      'master',
  },
  {
    id:          'aiml',
    name:        'AI / Machine Learning',
    icon:        '🤖',
    desc:        'Python · ML · Neural Networks',
    defaultRepo: 'ageron/handson-ml3',
    branch:      'main',
  },
  {
    id:          'gamedev',
    name:        'Game Development',
    icon:        '🎮',
    desc:        'JavaScript · Canvas · Game Logic',
    defaultRepo: 'jakesgordon/javascript-tetris',
    branch:      'master',
  },
  {
    id:          'devops',
    name:        'DevOps Engineering',
    icon:        '🔧',
    desc:        'Docker · CI/CD · Infrastructure',
    defaultRepo: 'docker/getting-started',
    branch:      'main',
  },
];
