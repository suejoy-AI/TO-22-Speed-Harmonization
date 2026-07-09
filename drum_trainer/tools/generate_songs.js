/*
 * generate_songs.js — builds drum_trainer/songs.js (window.DrumSongs).
 *
 * Songs are real, well-known tracks grouped by genre and by drum difficulty
 * (level 1 = easy beats ... level 5 = advanced). Each song gets a groove from
 * its level's palette plus a simple bass/chord backing derived from its key.
 * Backings are simplified original arrangements for practice, not recordings.
 */
const fs = require("fs");

// note name -> midi (octave 2, bass range)
const N = { C: 36, "C#": 37, Db: 37, D: 38, "D#": 39, Eb: 39, E: 40, F: 41,
  "F#": 42, Gb: 42, G: 43, "G#": 44, Ab: 44, A: 45, "A#": 46, Bb: 46, B: 47 };

// ---- Groove palettes: GROOVES[genre][level] = [ {tracks}, ... ] ----------
const G = {
  rock: {
    1: [
      { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-------x-------" },
      { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-----x-x-------" },
      { snare: "----x-------x---", kick: "x---x---x---x---" },
    ],
    2: [
      { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-----x-x---x---" },
      { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x--x--x-x--x----" },
      { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x---x-x-x---x---" },
    ],
    3: [
      { hihat: "xxxxxxxxxxxxxxxx", snare: "----x-------x---", kick: "x-----x-x---x---" },
      { openhat: "--------------o-", hihat: "x-x-x-x-x-x-x---", snare: "----x---g---x---", kick: "x--x--x---x-x---" },
      { hihat: "xxxxxxxxxxxxxxxx", snare: "----x-------x---", kick: "x---x-x-x--x-x--" },
    ],
    4: [
      { crash: "x---------------", hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x--x--x-x--x--x-" },
      { hihat: "xxxxxxxxxxxxxxxx", snare: "----x-------x---", kick: "x-x-x-x-x-x-x-x-" },
      { crash: "x---------------", hihat: "x-x-x-x-x-x-----", tomHigh: "------------x---", tomMid: "-------------x--", tomLow: "--------------xx", snare: "----x-------x---", kick: "x-----x-x-------" },
    ],
    5: [
      { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "xx-xxx-xxx-xxx-x" },
      { crash: "x-------x-------", hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-xxx-xxx-xxx-xx" },
      { ride: "x-x-x-x-x-x-x-x-", snare: "--x-x-x-x-x-x-x-", kick: "x-xx-xx-x-xx-xx-" },
    ],
  },
  pop: {
    1: [
      { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-------x-------" },
      { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x---x---x---x---" },
      { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x---x---x-x-x---" },
    ],
    2: [
      { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x---x-x-x---x-x-" },
      { openhat: "------o-------o-", hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x---x-x-x---x-x-" },
      { hihat: "x-x-x-x-x-x-x-x-", snare: "----x---x---x---", kick: "x---x---x---x---" },
    ],
    3: [
      { hihat: "xxxxxxxxxxxxxxxx", snare: "--g-x---g-g-x-g-", kick: "x---x-x-x---x---" },
      { hihat: "xxxxxxxxxxxxxxxx", snare: "----x-------x---", kick: "x-x---x-x-x---x-" },
      { openhat: "--------------o-", hihat: "x-x-x-x-x-x-x---", snare: "----x-------x---", kick: "x---x---x---x-x-" },
    ],
    4: [
      { crash: "x---------------", hihat: "xxxxxxxxxxxxxxxx", snare: "----x-------x---", kick: "x---x-x-x--x-x--" },
      { hihat: "x-xxx-xxx-xxx-xx", snare: "--g-x-g---g-x-g-", kick: "x---x---x---x---" },
      { openhat: "--o---o---o---o-", hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x---x---x---x---" },
    ],
    5: [
      { hihat: "xxxxxxxxxxxxxxxx", snare: "g-g-x-g-g-g-x-g-", kick: "x--x-x-x--x-x-x-" },
      { crash: "x-------x-------", hihat: "xxxxxxxxxxxxxxxx", snare: "----x-------x---", kick: "x-x-xx-x-x-xx-x-" },
      { openhat: "------------o---", hihat: "--x---x---x---x-", snare: "----x-----x-x---", kick: "x---x--x-x------" },
    ],
  },
  funk: {
    1: [
      { hihat: "xxxxxxxxxxxxxxxx", snare: "----x-------x---", kick: "x-------x-x-----" },
      { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x--x----x-x-----" },
      { hihat: "xxxxxxxxxxxxxxxx", snare: "----x-------x---", kick: "x---x---x---x---" },
    ],
    2: [
      { hihat: "xxxxxxxxxxxxxxxx", snare: "--g-x-g---g-x-g-", kick: "x--x----x-x-----" },
      { hihat: "xxxxxxxxxxxxxxxx", snare: "--g-x-----g-x---", kick: "x-----x-x-------" },
      { hihat: "x-xxx-xxx-xxx-xx", snare: "----x-------x---", kick: "x--x--x---x-----" },
    ],
    3: [
      { hihat: "x-xxx-xxx-xxx-xx", snare: "--g-x-g-g-g-x-g-", kick: "x--x--x---x-x---" },
      { hihat: "xxxxxxxxxxxxxxxx", snare: "--g-x-g---g-x-g-", kick: "x-----x---x-----" },
      { openhat: "---------o------", hihat: "x-xxx-xx--xxx-xx", snare: "--g-x-g---g-x-g-", kick: "x--x--x-x-x-----" },
    ],
    4: [
      { hihat: "xxxxxxxxxxxxxxxx", snare: "--gxx-g-g-gxx-g-", kick: "x--x-x-x--x-x---" },
      { openhat: "---------o------", hihat: "x-xxx-xxx-xxx-xx", snare: "--g-x-g-g-g-x-g-", kick: "x--x--x---x-x---" },
      { crash: "x---------------", hihat: "xxxxxxxxxxxxxxxx", snare: "--g-x-g---g-x---", tomLow: "-------------x-x", kick: "x--x--x---x-----" },
    ],
    5: [
      { hihat: "xxxxxxxxxxxxxxxx", snare: "g-gxx-gxg-gxx-gx", kick: "x-x--x-x-x--x-x-" },
      { openhat: "---------o------", hihat: "x-xxx-xxx-xxx-xx", snare: "g-g-x-g-g-g-x-gx", kick: "x--x-xx---x-x-x-" },
      { hihat: "xxxxxxxxxxxxxxxx", snare: "--gxx-g-gxg-x-g-", kick: "x-x-x--xx-x-x--x" },
    ],
  },
  jazz: {
    1: [
      { ride: "x---x-x-x---x-x-", hihat: "----x-------x---", kick: "x-------x-------" },
      { ride: "x-x-x-x-x-x-x-x-", hihat: "----x-------x---" },
      { ride: "x---x-x-x---x-x-", hihat: "----x-------x---" },
    ],
    2: [
      { ride: "x---x-x-x---x-x-", hihat: "----x-------x---", snare: "------g-------g-", kick: "x-------x-------" },
      { ride: "x---x-x-x---x-x-", hihat: "----x-------x---", kick: "x-----x-x-----x-" },
      { ride: "x---x-x-x---x-x-", hihat: "----x-------x---", snare: "------g-----g---" },
    ],
    3: [
      { ride: "x---x-x-x---x-x-", hihat: "----x-------x---", snare: "--g---g-g---g-x-", kick: "x-----x-x-----x-" },
      { ride: "x---x-x-x---x-x-", hihat: "----x-------x---", snare: "--g-x-g---g-x-g-", kick: "x-------x-------" },
      { ride: "x---x-x-x---x-x-", hihat: "----x-------x---", snare: "----g---x---g---", kick: "x---x---x---x---" },
    ],
    4: [
      { ride: "x---x-x-x---x-x-", hihat: "----x-------x---", snare: "--g-x-g-g-g-x-g-", kick: "x---x-x-x---x-x-" },
      { ride: "x-x-x-x-x-x-x-x-", hihat: "----x-------x---", snare: "--g-x-g---g-x-g-", kick: "x---x---x---x---" },
      { ride: "x---x-x-x---x-x-", hihat: "----x-------x---", snare: "g-g-x-g-g-g-x-g-", kick: "x-x---x-x-x---x-" },
    ],
    5: [
      { ride: "x---x-x---------", hihat: "----x-------x---", tomHigh: "--------x-x-----", tomMid: "----------x-x---", snare: "--g---g-----x-x-", kick: "x-------x-------" },
      { ride: "x-x-x-x-x-x-x-x-", hihat: "----x-------x---", snare: "g-gxg-g-gxg-x-g-", kick: "x-x-x-x-x-x-x-x-" },
      { snare: "x-xxx-xxx-xxx-xx", tomMid: "----x-------x---", tomLow: "------x-------x-", kick: "x---x---x---x---" },
    ],
  },
};

// ---- Backing generators per genre (from root midi R) ----------------------
const BACKING = {
  rock: (R) => ({
    bass: [R,0,0,0,0,0,R+7,0,R,0,0,0,R+7,0,0,0],
    chordMidis: [R+12, R+19, R+24], // power chord (root, 5th, octave)
    chordSteps: [0, 8],
  }),
  pop: (R) => ({
    bass: [R,0,0,0,R+7,0,0,0,R,0,R,0,R+7,0,0,0],
    chordMidis: [R+12, R+16, R+19], // major triad
    chordSteps: [0, 4, 8, 12],
  }),
  funk: (R) => ({
    bass: [R,0,R,0,0,R,0,0,R+7,0,0,R,R,0,0,0],
    chordMidis: [R+12, R+15, R+19], // minor color
    chordSteps: [0, 8],
  }),
  jazz: (R) => ({
    bass: [R,0,0,0,R+5,0,0,0,R+7,0,0,0,R+10,0,0,0], // walking-ish: root 4 5 b7
    chordMidis: [R+12, R+15, R+19, R+22], // minor 7
    chordSteps: [0, 8],
  }),
};

// ---- Song lists: [title, artist, bpm, key] grouped by genre/level ---------
const SONGS = {
  rock: {
    1: [
      ["We Will Rock You","Queen",81,"E"],["Seven Nation Army","The White Stripes",124,"E"],
      ["Smoke on the Water","Deep Purple",112,"G"],["Bad Moon Rising","CCR",94,"D"],
      ["Should I Stay or Should I Go","The Clash",114,"D"],["I Love Rock 'n' Roll","Joan Jett",92,"E"],
      ["You Really Got Me","The Kinks",138,"F"],["Blitzkrieg Bop","Ramones",170,"A"],
      ["Born in the U.S.A.","Bruce Springsteen",122,"E"],["Twist and Shout","The Beatles",126,"D"],
    ],
    2: [
      ["Back in Black","AC/DC",94,"E"],["Born to Be Wild","Steppenwolf",148,"E"],
      ["Paranoid","Black Sabbath",164,"E"],["Sweet Home Alabama","Lynyrd Skynyrd",98,"D"],
      ["Another Brick in the Wall","Pink Floyd",104,"D"],["Livin' on a Prayer","Bon Jovi",122,"E"],
      ["Basket Case","Green Day",172,"Eb"],["Brown Eyed Girl","Van Morrison",146,"G"],
      ["Highway to Hell","AC/DC",116,"A"],["Wonderwall","Oasis",87,"F#"],
      ["Who Made Who","AC/DC",113,"D"],["Get Back","The Beatles",123,"A"],
      ["Sgt. Pepper's Lonely Hearts Club Band","The Beatles",96,"G"],
    ],
    3: [
      ["Mr. Brightside","The Killers",148,"D"],["Born to Run","Bruce Springsteen",147,"E"],
      ["Use Somebody","Kings of Leon",136,"C"],["Are You Gonna Be My Girl","Jet",104,"E"],
      ["Plush","Stone Temple Pilots",72,"G"],["Otherside","Red Hot Chili Peppers",122,"A"],
      ["Hard to Handle","The Black Crowes",100,"B"],["When the Levee Breaks","Led Zeppelin",72,"F"],
      ["Don't Look Back in Anger","Oasis",82,"C"],["Float On","Modest Mouse",96,"A"],
    ],
    4: [
      ["Enter Sandman","Metallica",123,"E"],["Welcome to the Jungle","Guns N' Roses",124,"B"],
      ["The Pretender","Foo Fighters",173,"B"],["Toxicity","System of a Down",84,"C#"],
      ["Last Resort","Papa Roach",95,"G"],["Holiday","Green Day",148,"F"],
      ["Mr. Crowley","Ozzy Osbourne",70,"D"],["Black Dog","Led Zeppelin",83,"A"],
      ["Schism","Tool",96,"D"],["My Hero","Foo Fighters",140,"B"],
    ],
    5: [
      ["Tom Sawyer","Rush",88,"E"],["Hot for Teacher","Van Halen",180,"A"],
      ["Master of Puppets","Metallica",212,"E"],["One","Metallica",110,"B"],
      ["Painkiller","Judas Priest",200,"E"],["YYZ","Rush",132,"A"],
      ["Cult of Personality","Living Colour",136,"G"],["Bleed","Meshuggah",114,"F"],
      ["The Spirit of Radio","Rush",150,"E"],["La Villa Strangiato","Rush",160,"A"],
    ],
  },
  pop: {
    1: [
      ["Billie Jean","Michael Jackson",117,"F#"],["Stayin' Alive","Bee Gees",104,"F"],
      ["Shake It Off","Taylor Swift",160,"G"],["Happy","Pharrell Williams",160,"F"],
      ["Roar","Katy Perry",90,"C"],["Counting Stars","OneRepublic",122,"C#"],
      ["Sugar","Maroon 5",120,"D"],["Can't Stop the Feeling","Justin Timberlake",113,"C"],
      ["Call Me Maybe","Carly Rae Jepsen",120,"G"],["Shut Up and Dance","Walk the Moon",128,"D"],
    ],
    2: [
      ["Rolling in the Deep","Adele",105,"C"],["Bad Romance","Lady Gaga",119,"A"],
      ["Just Dance","Lady Gaga",119,"C#"],["Firework","Katy Perry",124,"Ab"],
      ["Poker Face","Lady Gaga",119,"G#"],["Locked Out of Heaven","Bruno Mars",144,"D"],
      ["Hey Ya!","OutKast",159,"G"],["Toxic","Britney Spears",143,"C"],
      ["Since U Been Gone","Kelly Clarkson",131,"B"],["Viva la Vida","Coldplay",138,"Ab"],
    ],
    3: [
      ["Uptown Funk","Mark Ronson ft. Bruno Mars",115,"D"],["24K Magic","Bruno Mars",107,"F"],
      ["Get Lucky","Daft Punk",116,"B"],["Treasure","Bruno Mars",116,"F"],
      ["Blinding Lights","The Weeknd",171,"F"],["Don't Start Now","Dua Lipa",124,"B"],
      ["September","Earth, Wind & Fire",126,"A"],["I Wanna Dance with Somebody","Whitney Houston",119,"G"],
      ["Levitating","Dua Lipa",103,"B"],["As It Was","Harry Styles",174,"A"],
    ],
    4: [
      ["Rather Be","Clean Bandit",121,"E"],["Crazy in Love","Beyoncé",99,"D"],
      ["Umbrella","Rihanna",174,"Ab"],["Hung Up","Madonna",126,"A"],
      ["Sorry","Justin Bieber",100,"F"],["Physical","Dua Lipa",147,"B"],
      ["Rain On Me","Lady Gaga & Ariana Grande",123,"G"],["Run the World (Girls)","Beyoncé",127,"E"],
      ["Cake by the Ocean","DNCE",119,"A"],["Shape of You","Ed Sheeran",96,"C#"],
    ],
    5: [
      ["Rosanna","Toto",87,"G"],["What's Love Got to Do with It","Tina Turner",98,"C"],
      ["Sledgehammer","Peter Gabriel",100,"Eb"],["Africa","Toto",92,"B"],
      ["Kiss","Prince",109,"A"],["Sir Duke","Stevie Wonder",116,"B"],
      ["I Wish","Stevie Wonder",105,"Eb"],["Hey Now","Cyndi Lauper",118,"F"],
      ["Vogue","Madonna",116,"Bb"],["Got to Give It Up","Marvin Gaye",110,"A"],
    ],
  },
  funk: {
    1: [
      ["Super Freak","Rick James",132,"A"],["Brick House","Commodores",108,"A"],
      ["Pick Up the Pieces","Average White Band",100,"F"],["Le Freak","Chic",120,"A"],
      ["Got to Give It Up","Marvin Gaye",110,"A"],["Celebration","Kool & The Gang",120,"F"],
      ["Play That Funky Music","Wild Cherry",110,"E"],["Give Up the Funk","Parliament",108,"D"],
      ["Flash Light","Parliament",108,"Bb"],["Shining Star","Earth, Wind & Fire",120,"D"],
    ],
    2: [
      ["Superstition","Stevie Wonder",100,"Eb"],["Uptown Funk","Bruno Mars",115,"D"],
      ["I Got You (I Feel Good)","James Brown",136,"D"],["Get Up Offa That Thing","James Brown",112,"E"],
      ["Word Up!","Cameo",114,"Bb"],["Jungle Boogie","Kool & The Gang",110,"E"],
      ["Thank You (Falettinme Be Mice Elf)","Sly & the Family Stone",118,"C"],["Fire","Ohio Players",114,"C"],
      ["Boogie Wonderland","Earth, Wind & Fire",126,"F"],["Family Affair","Sly & the Family Stone",92,"F"],
    ],
    3: [
      ["Sex Machine","James Brown",108,"D"],["Cissy Strut","The Meters",96,"C"],
      ["Chameleon","Herbie Hancock",110,"Bb"],["Cold Sweat","James Brown",112,"D"],
      ["What Is Hip?","Tower of Power",120,"E"],["Use Me","Bill Withers",100,"E"],
      ["Higher Ground","Stevie Wonder",96,"Eb"],["Funky Drummer","James Brown",100,"D"],
      ["Express Yourself","Charles Wright",104,"E"],["Soul Power","James Brown",110,"C"],
    ],
    4: [
      ["Papa Was a Rollin' Stone","The Temptations",98,"Bb"],["Pass the Peas","The J.B.'s",104,"F"],
      ["Funkin' for Jamaica","Tom Browne",112,"D"],["Flashlight","Parliament",109,"Bb"],
      ["Hollywood Swinging","Kool & The Gang",116,"E"],["Make It Funky","James Brown",110,"D"],
      ["Pick Up the Pieces (live)","Average White Band",104,"F"],["Stomp!","The Brothers Johnson",120,"Ab"],
      ["Strawberry Letter 23","The Brothers Johnson",96,"D"],["Doin' It to Death","The J.B.'s",108,"E"],
    ],
    5: [
      ["The Chicken","Jaco Pastorius",126,"Bb"],["School Days","Stanley Clarke",132,"B"],
      ["Aja","Steely Dan",118,"C"],["Cotton Tail","Buddy Rich",160,"Bb"],
      ["Got to Get You into My Life (funk)","Tower of Power",116,"G"],["Soul Vaccination","Tower of Power",112,"C"],
      ["Funky Miracle","The Meters",104,"C"],["Sing a Simple Song","Sly & the Family Stone",116,"C"],
      ["Birdland","Weather Report",158,"Bb"],["Teen Town","Weather Report",150,"E"],
    ],
  },
  jazz: {
    1: [
      ["So What","Miles Davis",136,"D"],["Autumn Leaves","Jazz Standard",120,"A"],
      ["Take the A Train","Duke Ellington",160,"C"],["Fly Me to the Moon","Standard",120,"A"],
      ["Summertime","Gershwin",90,"A"],["Blue Bossa","Kenny Dorham",140,"C"],
      ["Watermelon Man","Herbie Hancock",128,"F"],["C Jam Blues","Duke Ellington",150,"C"],
      ["Now's the Time","Charlie Parker",160,"F"],["Song for My Father","Horace Silver",128,"F"],
    ],
    2: [
      ["All Blues","Miles Davis",140,"G"],["Mr. P.C.","John Coltrane",170,"C"],
      ["Cantaloupe Island","Herbie Hancock",110,"F"],["Footprints","Wayne Shorter",132,"C"],
      ["Sidewinder","Lee Morgan",126,"E"],["Maiden Voyage","Herbie Hancock",120,"D"],
      ["Doxy","Sonny Rollins",138,"Bb"],["Killer Joe","Benny Golson",132,"C"],
      ["St. Thomas","Sonny Rollins",160,"C"],["Recorda Me","Joe Henderson",150,"A"],
    ],
    3: [
      ["Blue Train","John Coltrane",140,"Eb"],["Moanin'","Art Blakey",128,"F"],
      ["Work Song","Nat Adderley",148,"F"],["The Chicken","Pee Wee Ellis",126,"Bb"],
      ["Caravan","Duke Ellington",160,"C"],["Oleo","Sonny Rollins",170,"Bb"],
      ["Equinox","John Coltrane",110,"C#"],["Birk's Works","Dizzy Gillespie",132,"F"],
      ["Stolen Moments","Oliver Nelson",120,"C"],["Freddie Freeloader","Miles Davis",140,"Bb"],
    ],
    4: [
      ["Giant Steps","John Coltrane",290,"B"],["Spain","Chick Corea",132,"D"],
      ["Four","Miles Davis",180,"Eb"],["Confirmation","Charlie Parker",200,"F"],
      ["Donna Lee","Charlie Parker",220,"Ab"],["Cherokee","Standard",240,"Bb"],
      ["Joy Spring","Clifford Brown",180,"F"],["Anthropology","Charlie Parker",220,"Bb"],
      ["Airegin","Sonny Rollins",200,"F"],["Countdown","John Coltrane",290,"Eb"],
    ],
    5: [
      ["Take Five","Dave Brubeck",174,"Eb"],["Sing, Sing, Sing","Benny Goodman",215,"F"],
      ["A Love Supreme","John Coltrane",140,"F"],["Cottontail","Duke Ellington",230,"Bb"],
      ["Caravan (solo)","Buddy Rich",180,"C"],["Moment's Notice","John Coltrane",230,"Eb"],
      ["Inner Urge","Joe Henderson",200,"F"],["Black Codes","Wynton Marsalis",220,"C"],
      ["The Drum Also Waltzes","Max Roach",150,"C"],["Toccata","Chick Corea",180,"D"],
    ],
  },
};

// ---- Distinct per-song grooves + accurate signature beats ----------------
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) | 0; return Math.abs(h); }

const KICKS = {
  1: ["x-------x-------", "x---x---x---x---", "x-------x-x-----", "x-x-----x-x-----", "x-----x-x-------"],
  2: ["x-----x-x-------", "x---x---x-x-x---", "x--x--x-x--x----", "x-----x-x---x---", "x-x---x-x-x-----", "x---x-x-x---x---"],
  3: ["x-----x-x---x---", "x--x--x---x-x---", "x---x-x-x--x-x--", "x-x---x-x-x---x-", "x--x--x-x-x-----", "x-x-x---x-x-x---"],
  4: ["x--x--x-x--x--x-", "x-x--x-x-x-x--x-", "x--x-x-x--x-x---", "x-x-x-x-x-x-x-x-", "x--x--x---x-x-x-", "x-x--xx-x-x--x--"],
  5: ["xx-xxx-xxx-xxx-x", "x-xxx-xxx-xxx-xx", "xxx-xxx-xxx-xxx-", "x-x-xx-x-x-xx-x-", "xx-x-xx-xx-x-xx-", "x-xx-xx-x-xx-xx-"],
};
const JKICKS = ["x-------x-------", "x-----x-x-----x-", "x-------x-------", "x---x-x-x---x-x-", "x-----x-x-------"];
const BASE = {
  rock: { hat: "x-x-x-x-x-x-x-x-", hat16: "xxxxxxxxxxxxxxxx", snare: "----x-------x---", snareG: "--g-x-------x-g-" },
  pop:  { hat: "x-x-x-x-x-x-x-x-", hat16: "xxxxxxxxxxxxxxxx", snare: "----x-------x---", snareG: "--g-x---g-g-x-g-" },
  funk: { hat: "xxxxxxxxxxxxxxxx", hat16: "xxxxxxxxxxxxxxxx", snare: "----x-------x---", snareG: "--g-x-g---g-x-g-" },
};

// Accurate, recognizable signature beats for iconic songs (rhythms aren't
// copyrightable). Keyed by lowercase title. chorus optional.
const SIG = {
  "we will rock you": { verse: { snare: "----x-------x---", kick: "x-x-----x-x-----" } },
  "billie jean": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-------x-------" } },
  "back in black": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-----x-x---x---" } },
  "smoke on the water": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-------x-x-----" } },
  "highway to hell": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-------x-------" } },
  "seven nation army": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "--------x-------", kick: "x-------x-x-----" } },
  "blitzkrieg bop": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x---x---x---x---" } },
  "enter sandman": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x--x----x-x-----" } },
  "master of puppets": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "xxx-xxx-xxx-xxx-" } },
  "paranoid": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-x-----x-x-----" } },
  "stayin' alive": { verse: { openhat: "--o---o---o---o-", hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x---x---x---x---" } },
  "shake it off": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x---x---x---x---" } },
  "happy": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-------x-------" } },
  "superstition": { verse: { hihat: "xxxxxxxxxxxxxxxx", snare: "--g-x-g---g-x-g-", kick: "x-----x---x-----" } },
  "funky drummer": { verse: { hihat: "xxxxxxxxxxxxxxxx", openhat: "--------------o-", snare: "---gx-g-g-gxx-g-", kick: "x--x--x---x-----" } },
  "cold sweat": { verse: { hihat: "xxxxxxxxxxxxxxxx", snare: "----x-------x---", kick: "x--x----x-x-----" } },
  "sex machine": { verse: { hihat: "xxxxxxxxxxxxxxxx", snare: "----x-------x---", kick: "x--x--x---x-----" } },
  "chameleon": { verse: { hihat: "x-xxx-xxx-xxx-xx", snare: "----x-------x---", kick: "x-------x-x-----" } },
  "brick house": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x---x---x-x-----" } },
  "super freak": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-------x-------" } },
  "cissy strut": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-----x-x-------" } },
  "so what": { verse: { ride: "x---x-x-x---x-x-", hihat: "----x-------x---", snare: "------g-----x---", kick: "x-------x-------" } },
  "take five": { verse: { ride: "x---x-x-x---x-x-", hihat: "----x-------x---", snare: "------g-------g-", kick: "x-------x-------" } },
  "sweet child o' mine": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-------x-------" } },
  "should i stay or should i go": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-------x-------" } },
  "livin' on a prayer": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-----x-x---x---" } },
  "another brick in the wall": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x---x---x---x---" } },
  "welcome to the jungle": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-----x-x-------" } },
  "when the levee breaks": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-----x-x-------" } },
  "mr. brightside": { verse: { hihat: "xxxxxxxxxxxxxxxx", snare: "----x-------x---", kick: "x---x---x---x---" } },
  "rolling in the deep": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x---x---x---x---" } },
  "uptown funk": { verse: { hihat: "x-xxx-xxx-xxx-xx", snare: "----x-------x---", kick: "x--x--x---x-----" } },
  "get lucky": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-------x-------" } },
  "sweet home alabama": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-------x-------" } },
  "born to be wild": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x---x---x---x---" } },
  "you really got me": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x---x---x---x---" } },
  "september": { verse: { hihat: "xxxxxxxxxxxxxxxx", snare: "----x-------x---", kick: "x---x---x---x---" } },
  "who made who": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-----x-x-------" } },
  "get back": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-------x-x-----" } },
  "sgt. pepper's lonely hearts club band": { verse: { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-----x-x---x---" } },
};

function buildGroove(genre, lvl, title) {
  const h = hashStr(title);
  if (genre === "jazz") {
    const snare = lvl >= 3 ? "--g-x-g---g-x-g-" : (lvl === 2 ? "------g-----g---" : "------g-------g-");
    const verse = { ride: "x---x-x-x---x-x-", hihat: "----x-------x---", snare, kick: JKICKS[h % JKICKS.length] };
    const chorus = { ride: "x---x-x-x---x-x-", hihat: "----x-------x---", snare: "--g-x-g-g-g-x-g-", kick: JKICKS[(h + 2) % JKICKS.length] };
    return { verse, chorus };
  }
  const b = BASE[genre];
  const use16 = genre === "funk" || (lvl >= 3 && h % 3 === 0);
  const useGhost = (genre === "funk" && lvl >= 2) || (lvl >= 2 && h % 2 === 0);
  const hat = use16 ? b.hat16 : b.hat;
  const snare = useGhost ? b.snareG : b.snare;
  const verse = { hihat: hat, snare, kick: KICKS[lvl][h % KICKS[lvl].length] };
  const cl = Math.min(lvl + 1, 5);
  const chorus = { hihat: hat, snare, kick: KICKS[cl][(h + 3) % KICKS[cl].length] };
  if (h % 2 === 0) chorus.openhat = "--------------o-";
  return { verse, chorus };
}

function grooveFor(genre, lvl, title) {
  const sig = SIG[title.toLowerCase()];
  if (sig) return { verse: sig.verse, chorus: sig.chorus || sig.verse };
  return buildGroove(genre, lvl, title);
}

// ---- Build ---------------------------------------------------------------
const out = {};
const tips = {
  1: "Beginner groove — lock in the basic beat.",
  2: "Easy — steady backbeat with a little movement.",
  3: "Intermediate — busier hats, ghost notes or syncopation.",
  4: "Advanced — faster and more intricate.",
  5: "Expert — demanding, technical drumming.",
};

for (const genre of Object.keys(SONGS)) {
  out[genre] = {};
  for (let lvl = 1; lvl <= 5; lvl++) {
    out[genre][lvl] = SONGS[genre][lvl].map((s) => {
      const [title, artist, bpm, key] = s;
      const R = N[key];
      if (R === undefined) throw new Error(`Unknown key '${key}' for ${title}`);
      const g = grooveFor(genre, lvl, title);
      const signature = !!SIG[title.toLowerCase()];
      return {
        title, artist, bpm, key, root: R, sig: signature,
        tip: signature ? `Signature beat — the real groove of this song.  (${artist})` : `${tips[lvl]}  (${artist})`,
        tracks: g.verse,
        gChorus: g.chorus,
      };
    });
  }
}

const js = "/* Auto-generated by tools/generate_songs.js — do not edit by hand.\n" +
  " * Real songs grouped by genre and drum difficulty (level 1 easy .. 5 hard).\n" +
  " * Backings are simplified original arrangements for practice, not recordings. */\n" +
  "window.DrumSongs = " + JSON.stringify(out) + ";\n";
fs.writeFileSync("/home/user/TO-22-Speed-Harmonization/drum_trainer/songs.js", js);

let total = 0;
for (const g of Object.keys(out)) for (let l = 1; l <= 5; l++) total += out[g][l].length;
console.log("Wrote songs.js:", total, "songs across", Object.keys(out).length, "genres x 5 levels");
for (const g of Object.keys(out)) console.log(" ", g, [1,2,3,4,5].map(l=>out[g][l].length).join("/"));
