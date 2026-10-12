/* The built-in help. It is part of the machine, not a file on its disk, so it
   cannot be deleted, edited or lost: the Help menu works even after every
   file has been thrown away. Pages are DolDoc, the same format as the .DD
   files. A link to "@topic" jumps to that page; a macro starting with "@"
   does a thing (@restore, @open:<app>); anything else is HolyC. */
import { isOpen as vroomOpen } from './vroom_gate_core.js';
export const TOPICS = [
  ['start', 'START HERE'],
  ['keys', 'MOUSE & KEYS'],
  ['files', 'FILES & FOLDERS'],
  ['music', 'MAKING MUSIC'],
  ['fix', 'SOMETHING IS MISSING'],
  ['holyc', 'HOLYC'],
  ['trophies', 'TROPHIES']
];

export const PAGES = {
start: `$FG,14$$TX+CX,"HELP"$$FG$
$HL$
This is the machine's own help. It lives inside the machine, so
it is always here, whatever has been deleted.

$TR,"THE SHORT VERSION"$
$FG,11$Double-click$FG$ an icon to open it. $FG,11$Drag$FG$ icons anywhere. $FG,11$Drag$FG$ an
icon onto a folder to put it inside, onto the $FG,14$RecycleBin$FG$ to delete it.
$FG,11$Right-click$FG$ for a menu. $FG,11$Ctrl and +/-$FG$ zooms the window you are in.
$TR-$

$TR,"WHERE TO GO NEXT"$
$LK,"MOUSE & KEYS",A="FI:@keys"$       everything the mouse and keyboard do
$LK,"FILES & FOLDERS",A="FI:@files"$    folders, moving, copying, the bin
$LK,"MAKING MUSIC",A="FI:@music"$       the Garage, and how to learn it
$LK,"SOMETHING IS MISSING",A="FI:@fix"$ get the machine's own files back
$LK,"HOLYC",A="FI:@holyc"$              the language
$LK,"TROPHIES",A="FI:@trophies"$          what there is to find
$TR-$

$TR,"THINGS TO PRESS"$
$MA,"OPEN THE GARAGE",LM="@open:garage"$     make music, 20+ real instruments
$MA,"THE TOUR OF WHAT THIS HAS",LM="@welcome"$  every tool, with a button each
$MA,"OPEN THE TERMINAL",LM="@open:terminal"$  type commands
$MA,"RESTORE SYSTEM FILES",LM="@restore"$     bring back anything that was deleted
$TR-$
$FG,8$640K. 16 colours. One voice. No network.$FG$
`,

keys: `$FG,14$$TX+CX,"MOUSE & KEYS"$$FG$
$HL$
$TR,"THE MOUSE"$
$FG,11$Left click$FG$      select. Ctrl or Shift adds to the selection.
$FG,11$Double click$FG$    open. On a title bar: fill the desktop.
$FG,11$Drag$FG$            move icons and windows. Drag on the bare
                  desktop or in a folder to rubber-band a group.
$FG,11$Right click$FG$     the menu for what you are pointing at. A game
                  that does not use the right button ignores it.
$FG,11$Ctrl + wheel$FG$    zoom the window under the pointer.
$TR-$

$TR,"WINDOWS"$
$FG,11$[Z]$FG$ zoom this window, bigger or smaller, and remember it.
$FG,11$[T]$FG$ (NOTES only) a colour scheme for just this Notes window. Notes is dressed all
                  the way down, its frame and its page. The rest of the machine wears the
                  scheme on the outside only: every window's frame, the menu bar, the
                  taskbar, the desktop and the pop-ups. What is inside a window, a game or
                  a picture, keeps its own colours. It is held to readable, whatever is chosen.
$FG,11$[_]$FG$ tuck it into the taskbar.  $FG,11$[□]$FG$ fill the desktop (or F11).
$FG,11$[X]$FG$ close.
A program that opens once comes back where you left it, at the size you made it.
$TR-$

$TR,"THE TASKBAR"$
Every window has a button with its program's picture. With many open the names
go and the pictures stay: hold the pointer on one for its name.
$FG,11$Left click$FG$    bring it forward; again, tuck it away.
$FG,11$Right click$FG$   restore or minimise, fullscreen, close.
$FG,11$Middle click$FG$  close it.
$FG,11$The strip at the far right$FG$ puts every window away; press it again to bring
                    back exactly the ones it put away.
$TR-$

$TR,"GO TO"$
$FG,11$Ctrl+Space$FG$ (or Tools, GO TO) opens a box. Type a few letters of a program, a
window that is open, a file anywhere on the desk, or a thing to do (SHOW THE
DESKTOP, RESTORE SYSTEM FILES): $FG,11$Up/Down$FG$ choose, $FG,11$Enter$FG$ go, $FG,11$Esc$FG$ away. What you used last
is offered first.
$TR-$

$TR,"THE KEYBOARD, IN A LIST OF FILES"$
$FG,11$Delete$FG$      into the recycle bin      $FG,11$F2$FG$        rename
$FG,11$Enter$FG$       open                      $FG,11$Ctrl+A$FG$    select all
$FG,11$Ctrl+C / X / V$FG$  copy, cut, paste      $FG,11$Ctrl+D$FG$    duplicate
$FG,11$Ctrl+Z$FG$      undo the last delete      $FG,11$Backspace$FG$ up one folder
$TR-$

$TR,"ZOOM"$
$FG,11$Ctrl +$FG$  bigger     $FG,11$Ctrl -$FG$  smaller     $FG,11$Ctrl 0$FG$  back to normal
Works in whichever window is in front.
$TR-$
`,

files: `$FG,14$$TX+CX,"FILES & FOLDERS"$$FG$
$HL$
$TR,"FOLDERS ARE FOLDERS"$
Drag an icon onto a folder (on the desktop or in a window) and it goes
inside. Drag it out onto the desktop, or into another folder window, and
it comes out. Hold $FG,11$Ctrl$FG$ while you let go to copy instead of move.
Press $FG,11$Esc$FG$ in the middle of a drag to change your mind.
$TR-$

$TR,"THE RECYCLE BIN"$
Delete never destroys anything. It puts the thing in the $FG,14$RecycleBin$FG$.
Open the bin to put things back, or to throw them away for good.
$FG,11$Ctrl+Z$FG$ undoes the last delete at once.
$TR-$

$TR,"MAKING THINGS"$
Right-click the desktop or a folder: $FG,11$NEW FOLDER$FG$, $FG,11$NEW TEXT FILE$FG$, or
upload pictures, video and text from your own computer. You can also just
drag a file from your computer onto a folder.
$TR-$

$TR,"PICTURES"$
Right-click a picture: $FG,11$SET AS BACKGROUND$FG$. Open it, and the viewer
has the same button, with five ways to fit it on the screen.
$TR-$

$TR,"RENAME, COPY, PROPERTIES"$
$FG,11$F2$FG$ renames. $FG,11$Ctrl+C$FG$ then $FG,11$Ctrl+V$FG$ copies. $FG,11$Properties$FG$ in the right-click
menu says what a thing is, how big it is, and whether it came with the machine.
$TR-$
`,

music: `$FG,14$$TX+CX,"MAKING MUSIC"$$FG$
$HL$
The $FG,14$Garage$FG$ is a band in a box: more than twenty real instruments, a drum
kit, a mixer, and a song you can save.

$TR,"NEVER PLAYED ANYTHING?"$
Open the Garage and press $FG,11$LEARN$FG$. Eight tiny lessons, each one a toy.
By lesson eight you have made a song. Nothing in it can sound wrong.
$TR-$

$TR,"THE IDEA"$
The $FG,11$MAGIC NOTES$FG$ button keeps every note inside a key, so any note you
press fits with every other. It is the same trick a lot of real songs use.
$TR-$

$MA,"OPEN THE GARAGE",LM="@open:garage"$
`,

fix: `$FG,14$$TX+CX,"SOMETHING IS MISSING"$$FG$
$HL$
The machine came with apps, documents and folders. Any of them can be
deleted, but none of them are lost for good:

$FG,11$1.$FG$ Look in the $FG,14$RecycleBin$FG$. Deleted things wait there. $FG,11$Ctrl+Z$FG$ also
   puts the last one back.
$FG,11$2.$FG$ If it is not there, press the button below. It brings back every
   system file that is gone, and nothing else. Files you have edited,
   moved or renamed are left alone. The desktop is not reset.

$MA,"RESTORE SYSTEM FILES",LM="@restore"$
$MA,"OPEN THE RECYCLE BIN",LM="@open:trash"$

$FG,8$The same thing is in the File menu, the Help menu, the desktop's
right-click menu, and the terminal (type RESTORE).$FG$
`,

holyc: `$FG,14$$TX+CX,"HOLYC"$$FG$
$HL$
HolyC is C with the ceremony removed. A bare string is a
print. There is no $FG,12$main()$FG$. Every line is both script and
source, and the shell is the compiler.

$TR,"THE ONE THING TO TRY FIRST"$
A statement that is only a string prints it:

$FG,11$  "HELLO, TEMPLE.\\n";$FG$

Type that into the terminal. It compiles and runs.
$TR-$

$TR,"LEARNING IT"$
HOLYC.EXE (the icon on the desktop, or type HOLYC) teaches it:
seven lessons that tick off as you type, fifty puzzles judged by
tests, and a workshop. A program that uses Button, Label, Field,
Pixel or Note is an app: RUN IT on a .HC file opens it as one.
$TR-$

$TR,"TYPES"$
$FG,10$  U0$FG$   nothing
$FG,10$  I64$FG$  a signed 64 bit integer
$FG,10$  F64$FG$  a double
$FG,10$  U8$FG$   a byte, and a character
$TR-$

$TR,"CALLING WITHOUT PARENTHESES"$
A function name on its own line is a call. These two are the same:

$FG,11$  GodWord;
  GodWord();$FG$
$TR-$

$TR,"WHAT THIS MACHINE UNDERSTANDS"$
The types U0 I8 U8 I16 U16 I32 U32 I64 U64 F64 Bool (they wrap to
their size), and your own: class, with a base class, and union.
Arrays, tables and { } lists. Pointers: & * [ ] -> and the step
of pointer arithmetic. A cast is written after: x(U8), p(I64 *).
Operators with HolyC's precedence (a & b + c is (a & b) + c):
+ - * / % \` << >> & | ^ ~ ! && ^^ ||, 0 < x < 10, and the
assignments += -= *= /= %= &= |= ^= <<= >>=.
if / else, while, do, for, switch (with case 1...5: and default:,
and start: / end: for a sub-switch), goto and labels, try / catch /
throw, lock. Functions with default arguments, ... (argc, argv),
prototypes, pointers to functions, static locals, and calls with or
without parens. sizeof and offset. #define (with arguments), #undef,
#ifdef #ifndef #if #else #endif.
Built in: Print, GodWord, GodDoodle, GodSong, Beep, BellRing,
Sleep, Rand, RandU16, Cd, Dir, Panic, Exit, the maths (Abs Min Max
Sqrt Sqr Pow Exp Ln Log10 Log2 Sin Cos Tan ATan ASin ACos Floor
Ceil Round Clamp Sign GCD), memory (MAlloc CAlloc Free MSize MemCpy
MemSet MemCmp), text (StrLen StrCpy StrNew StrCmp StrICmp StrNCmp
StrPrint CatPrint StrMatch Str2I64 Str2F64), bits (Bt Bts Btr Btc
Bsf Bsr) and PutExcept. Fs->except_ch is what a catch caught.
$TR-$

$TR,"A CLASS, A POINTER, A LIST"$
$FG,11$  class CNode { I64 v; CNode *next; };
  CNode a, b;
  a.v = 1; b.v = 2; a.next = &b; b.next = NULL;
  CNode *p = &a;
  while (p) { "%d\\n", p->v; p = p->next; }$FG$
Members are packed, with no gaps, as TempleOS lays them out.
Reading or writing a NULL or a wild address says so, and which line.
$TR-$
`,

trophies: `$FG,14$$TX+CX,"TROPHIES"$$FG$
$HL$
Everything on this machine that is worth doing once has a trophy, and
they are all in $FG,14$TROPHIES.EXE$FG$ (the cup in the taskbar, or the
desktop menu, or type $FG,11$TROPHIES$FG$ in the terminal).

$TR,"TIERS"$
$FG,6$BRONZE$FG$ 15 SUN, $FG,7$SILVER$FG$ 40 SUN, $FG,14$GOLD$FG$ 100 SUN. A seal ($FG,15$MASTER OF$FG$ a game) is 150.
The SUN is paid once, and shows in ACCOUNT.EXE as TROPHY: and the name.
$TR-$

$TR,"SECRETS"$
A card that says $FG,13$???$FG$ is a secret. It gives you a rumour about where to look,
never the answer. When it is found it turns into its real name.
$TR-$

$TR,"CLOSED"$
Nothing is ever missed for good. If something can no longer be earned the
ledger says $FG,12$CLOSED$FG$, greys it out, and takes it out of the count.
$TR-$

$TR,"THE GAMES' OWN"$
Cook and Magen had achievements before there was a ledger. They are shown
under their game, pay nothing here and count nowhere, so nobody loses what they had.
$TR-$

$MA,"OPEN TROPHIES.EXE",LM="@open:trophies"$
`,
};

/* The pages that are not in the list until something has been earned (kernel/vroom_gate_core.js). They live apart from TOPICS and PAGES so nothing that walks those -- the trophy that asks for
   every page to be read, a search, a check -- can find them while the gate is shut. Ask `topicsNow()` and `pageNow(id)`. */
export const GATED_TOPICS = [['vroom', 'VROOM']];
export const GATED_PAGES = {
vroom: `$FG,14$$TX+CX,"VROOM"$$FG$
$HL$
Something in the garage started its engine. VROOM.EXE is a racing game:
a radio-controlled courier car in a life-size, snowed-in mountain town.
It is light, it bounces, and it will land on its roof. That is allowed.
Seven rivals, ten pickups, eight roads, twenty-four cars, and a radio.

$TR,"DRIVING"$
$FG,11$Up / W$FG$ gas   $FG,11$Down / S$FG$ brake, and reverse from a stop
$FG,11$Left Right / A D$FG$ steer   $FG,11$Space / E / Shift$FG$ use the pickup you hold
$FG,11$R$FG$ reposition: back on the line after a moment (three seconds on the
roof, or against a wall, does it for you)   $FG,11$H$FG$ the horn   $FG,11$Esc / P$FG$ pause
$FG,11$V$FG$ the radio: RACE (drum and bass) or NIGHT (lo-fi), anywhere
In the air a little pitch and roll are yours, and the car comes level
by itself. A tall car rolls on a kerb. A light one stands on its tail.
$TR-$

$TR,"THE MODES"$
$FG,11$CHAMPIONSHIP$FG$ four cups of four races: points to the top eight,
the top three go on, three tries a cup. A cup passed opens the next
cup's cars. $FG,11$SINGLE RACE$FG$ any road you have, any car you have, 2 to 8
cars. $FG,11$TIME TRIAL$FG$ alone, against your own ghost; the challenge time
opens the road reversed, then mirrored, then both. $FG,11$PRACTICE$FG$ no
rivals, and one hidden star on every road, somewhere you must drive to.
$FG,11$STUNT YARD$FG$ a skate park in the snow: twenty stars in the air.
$FG,11$LAST MILE$FG$ the parcel rides in the bed and can fall out; stop on it,
then stop on the lit door. First to six. $FG,11$CLOCKWORK$FG$ sixteen
wind-up trucks and no pickups at all.
$FG,11$2P SPLIT$FG$ two people, one keyboard, the glass cut in two: the left
hand is W A S D (Space / E / Shift fires, R puts you back), the right is
the arrows (Enter / Right Shift / 0 fires, / puts you back). Up to six CPU
cars come too. It pays nothing and keeps nothing.
$TR-$

$TR,"THE TRACK MAKER"$
Draw a road of your own: a ring of tiles, one wide, no forks. The arrows
move, $FG,11$Enter$FG$ does what the tool in hand does (the pen puts the road down
and follows you; Enter lifts it), $FG,11$1 to 9$FG$ choose the tool, $FG,11$Tab$FG$ the menu:
theme, laps, name, SAVE, OPEN, NEW, TEST DRIVE. A jump, a belt, a pinch,
a counter to drive under, pickups and a kerb stand on tiles; the road says
what is wrong, and at which tile. A road is kept as text,
$FG,11$::/Home/Vroom/NAME.TRK$FG$, and is then in SINGLE RACE, TIME TRIAL and the
2P SPLIT after the town's roads. It pays nothing, and it is raced in
whatever tyres it needs.
$TR-$

$TR,"THE PICKUPS"$
Parcels lie on the road. You hold one at a time (two with a ROOF RACK).
What you are dealt depends on where you are: the leader draws the things
that hold a race back, the last place the things that win it.
$FG,11$STATIC BALL$FG$ rolls ahead and flips what it touches   $FG,11$BOTTLE ROCKET$FG$
$FG,11$JUMP LEADS$FG$ crackle for five seconds   $FG,11$ANTIFREEZE$FG$ a puddle behind you
$FG,11$SNOWBALLS$FG$ three, thrown ahead   $FG,11$CURLING STONE$FG$ dropped behind you
$FG,11$FAKE PARCEL$FG$ looks like a pickup, and is not   $FG,11$COFFEE$FG$ a tenth more speed
$FG,11$POWER CUT$FG$ for the cars ahead of you; only the back half is dealt it
$FG,11$HOT PARCEL$FG$ the fuse is your antenna: touch a car and it is theirs
$TR-$

$TR,"THE DEPOT"$
Races pay TIPS, and TIPS buy parts. $FG,11$Route parts$FG$ open roads: SNOW TYRES,
HEADLIGHTS, a BUMPER BAR for the fence gates, ICE CHAINS, a ROOF RACK.
$FG,11$Tuning$FG$ is a motor, gearing, springs, tyres, a battery and ballast, three
levels each. Every race has a rating, and it caps the car: tuning lets
a weak car reach the cap, and nothing passes it. The rivals shop too.
$TR-$

$TR,"THE MACHINE"$
The machine pays SUN for the things that are done once: a cup passed, the
first win on a road, a star, a challenge time. Its trophies are in the
ledger. Terminal: $FG,11$VROOM$FG$, $FG,11$RACE$FG$ or $FG,11$CARS$FG$. GO TO finds it by name.
$TR-$
`
};
export const topicsNow = () => (vroomOpen() ? TOPICS.concat(GATED_TOPICS) : TOPICS);
export const pageNow = id => (PAGES[id] || (vroomOpen() ? GATED_PAGES[id] : null) || null);
