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
    purpose:     'Teaches building complete, end-to-end web applications. You will learn to construct responsive interfaces, control browser states, parse API requests, and integrate server-side database operations.',
    defaultRepo: 'bradtraversy/vanillawebprojects',
    branch:      'master',
  },
  {
    id:          'frontend',
    name:        'Frontend Development',
    icon:        'UI',
    desc:        'HTML · CSS · Responsive UI',
    purpose:     'Focuses on the visual and user-interaction layers of modern web systems. You will learn CSS layouts, design tokens, component interactions, and DOM manipulations.',
    defaultRepo: 'wesbos/JavaScript30',
    branch:      'master',
  },
  {
    id:          'backend',
    name:        'Backend Development',
    icon:        'API',
    desc:        'Node.js · Express · REST APIs',
    purpose:     'Focuses on designing secure and performant server infrastructures. You will build REST API endpoints, configure request middleware, handle data mapping, and process network routing.',
    defaultRepo: 'expressjs/express',
    branch:      'master',
  },
  {
    id:          'mobile',
    name:        'Mobile App Dev',
    icon:        'MOB',
    desc:        'React Native · Mobile UI',
    purpose:     'Builds mobile app components and layout frameworks. You will understand navigation flows, gesture components, and cross-platform native hooks.',
    defaultRepo: 'react-native-community/hooks',
    branch:      'main',
  },
  {
    id:          'ios',
    name:        'iOS Development',
    icon:        'iOS',
    desc:        'Swift · UIKit · Xcode',
    purpose:     'Focuses on Apple Swift syntax and native iOS architecture. You will practice data structures, algorithmic implementations, and standard native controls.',
    defaultRepo: 'raywenderlich/swift-algorithm-club',
    branch:      'master',
  },
  {
    id:          'macos',
    name:        'macOS Development',
    icon:        'MAC',
    desc:        'SwiftUI · AppKit · macOS APIs',
    purpose:     'Builds native utility programs and formatters for macOS. You will learn Swift tooling design, syntax styling rules, and OS-level terminal tools.',
    defaultRepo: 'nicklockwood/SwiftFormat',
    branch:      'main',
  },
  {
    id:          'swiftui',
    name:        'SwiftUI',
    icon:        'SUI',
    desc:        'SwiftUI · Combine · Swift',
    purpose:     'Focuses on Apple’s modern declarative UI framework. You will type components, handle reactive states, and learn Combine-driven workflows.',
    defaultRepo: 'twostraws/HackingWithSwift',
    branch:      'main',
  },
  {
    id:          'hacking',
    name:        'Ethical Hacking',
    icon:        'SEC',
    desc:        'Vulnerability Testing · Pentesting',
    purpose:     'Examines web application vulnerabilities and security anti-patterns. You will type vulnerable setups and security testing scripts to understand system exploits.',
    defaultRepo: 'OWASP/NodeGoat',
    branch:      'master',
  },
  {
    id:          'cybersec',
    name:        'Cybersecurity Dev',
    icon:        'DEF',
    desc:        'Security Tools · Defense Code',
    purpose:     'Builds security scanning and defensive scripts. You will type automation configurations, routing testing units, and threat intelligence helpers.',
    defaultRepo: 'threat9/routersploit',
    branch:      'master',
  },
  {
    id:          'aiml',
    name:        'AI / Machine Learning',
    icon:        'AI',
    desc:        'Python · ML · Neural Networks',
    purpose:     'Covers mathematical, statistical, and model training patterns. You will type neural networks, pipeline data transformations, and machine learning model setups.',
    defaultRepo: 'ageron/handson-ml3',
    branch:      'main',
  },
  {
    id:          'gamedev',
    name:        'Game Development',
    icon:        'GAME',
    desc:        'JavaScript · Canvas · Game Logic',
    purpose:     'Builds interactive 2D graphics, physics checks, and collision mechanisms. You will learn grid-based layouts, game loop clocks, and browser Canvas drawing.',
    defaultRepo: 'jakesgordon/javascript-tetris',
    branch:      'master',
  },
  {
    id:          'devops',
    name:        'DevOps Engineering',
    icon:        'OPS',
    desc:        'Docker · CI/CD · Infrastructure',
    purpose:     'Focuses on infrastructure deployment automation. You will type container definitions, setup script helpers, and configure environment deployments.',
    defaultRepo: 'docker/getting-started',
    branch:      'main',
  },
];
