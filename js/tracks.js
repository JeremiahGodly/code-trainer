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
    icon:        'WEB',
    desc:        'HTML · CSS · JavaScript · Node.js',
    defaultRepo: 'bradtraversy/vanillawebprojects',
    branch:      'master',
  },
  {
    id:          'frontend',
    name:        'Frontend Development',
    icon:        'UI',
    desc:        'HTML · CSS · Responsive UI',
    defaultRepo: 'wesbos/JavaScript30',
    branch:      'master',
  },
  {
    id:          'backend',
    name:        'Backend Development',
    icon:        'API',
    desc:        'Node.js · Express · REST APIs',
    defaultRepo: 'expressjs/express',
    branch:      'master',
  },
  {
    id:          'mobile',
    name:        'Mobile App Dev',
    icon:        'MOB',
    desc:        'React Native · Mobile UI',
    defaultRepo: 'react-native-community/hooks',
    branch:      'main',
  },
  {
    id:          'ios',
    name:        'iOS Development',
    icon:        'iOS',
    desc:        'Swift · UIKit · Xcode',
    defaultRepo: 'raywenderlich/swift-algorithm-club',
    branch:      'master',
  },
  {
    id:          'macos',
    name:        'macOS Development',
    icon:        'MAC',
    desc:        'SwiftUI · AppKit · macOS APIs',
    defaultRepo: 'nicklockwood/SwiftFormat',
    branch:      'main',
  },
  {
    id:          'swiftui',
    name:        'SwiftUI',
    icon:        'SUI',
    desc:        'SwiftUI · Combine · Swift',
    defaultRepo: 'twostraws/HackingWithSwift',
    branch:      'main',
  },
  {
    id:          'hacking',
    name:        'Ethical Hacking',
    icon:        'SEC',
    desc:        'Vulnerability Testing · Pentesting',
    defaultRepo: 'OWASP/NodeGoat',
    branch:      'master',
  },
  {
    id:          'cybersec',
    name:        'Cybersecurity Dev',
    icon:        'DEF',
    desc:        'Security Tools · Defense Code',
    defaultRepo: 'threat9/routersploit',
    branch:      'master',
  },
  {
    id:          'aiml',
    name:        'AI / Machine Learning',
    icon:        'AI',
    desc:        'Python · ML · Neural Networks',
    defaultRepo: 'ageron/handson-ml3',
    branch:      'main',
  },
  {
    id:          'gamedev',
    name:        'Game Development',
    icon:        'GAME',
    desc:        'JavaScript · Canvas · Game Logic',
    defaultRepo: 'jakesgordon/javascript-tetris',
    branch:      'master',
  },
  {
    id:          'devops',
    name:        'DevOps Engineering',
    icon:        'OPS',
    desc:        'Docker · CI/CD · Infrastructure',
    defaultRepo: 'docker/getting-started',
    branch:      'main',
  },
];
