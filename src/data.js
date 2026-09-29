/* ════════════════════════════════════════════════════════════════
   THE PLAN — AR GYM program, slides 6–19.
   wu = warm-up sets, s = working sets, v = demo video slug
   (served from /videos/<v>.mp4, poster /videos/posters/<v>.jpg).
   ════════════════════════════════════════════════════════════════ */
export const DAYS = {
  d1:{label:"day 1",ex:[
    {n:"Cable y raises",wu:1,s:2,reps:"8-12",rir:"1-0",rest:"1-2 min",sec:60,v:"cable-y-raises"},
    {n:"Wide grip latpulldown",wu:1,s:3,reps:"6-10",rir:"1-0",rest:"2-3 min",sec:120,v:"wide-grip-latpulldown"},
    {n:"Kelso shrugs",wu:1,s:2,reps:"8-12",rir:"1-0",rest:"2-3 min",sec:120,v:"kelso-shrugs"},
    {n:"T bar machine",wu:0,s:1,reps:"6-10",rir:"1-0",rest:"2-3 min",sec:120,v:"t-bar-machine"},
    {n:"Cable lat pullover",wu:1,s:3,reps:"6-10",rir:"1-0",rest:"2-3 min",sec:120,v:"cable-lat-pullover"},
    {n:"DB lateral raises",wu:1,s:2,reps:"8-10",rir:"1-0",rest:"2-3 min",sec:120,v:"db-lateral-raises"},
    {n:"Cable reverse curl",wu:1,s:1,reps:"8-12",rir:"1-2",rest:"1.5-2 min",sec:90,v:"cable-reverse-curl"},
    {n:"Abdominal crunches",wu:1,s:2,reps:"8-12",rir:"1-0",rest:"1.5-2 min",sec:90,v:"abdominal-crunches"}]},
  d2:{label:"day 2",ex:[
    {n:"DB low incline chest press",wu:2,s:3,reps:"6-10",rir:"1-0",rest:"2-3 min",sec:120,v:"db-low-incline-chest-press"},
    {n:"Chest fly machine",wu:0,s:2,reps:"8-12",rir:"1-0",rest:"2-3 min",sec:120,v:"chest-fly-machine"},
    {n:"DB no cheat curl",wu:1,s:2,reps:"8-12",rir:"1-0",rest:"2-3 min",sec:120,v:"db-no-cheat-curl"},
    {n:"Rope triceps pushdown",wu:1,s:3,reps:"8-12",rir:"1-0",rest:"2-3 min",sec:120,v:"rope-triceps-pushdown"},
    {n:"Biceps bayesian curl",wu:1,s:2,reps:"8-12",rir:"1-0",rest:"2-3 min",sec:120,v:"biceps-bayesian-curl"},
    {n:"Rope overhead extension",wu:1,s:2,reps:"8-10",rir:"1-0",rest:"1.5-2 min",sec:90,v:"rope-overhead-extension"},
    {n:"Cable hammer curl",wu:0,s:1,reps:"8-10",rir:"1-0",rest:"1.5-2 min",sec:90,v:"cable-hammer-curl"}]},
  d3:{label:"day 3",ex:[
    {n:"Seated leg curl",wu:2,s:2,reps:"10-12",rir:"1-0",rest:"2-3 min",sec:120,v:"seated-leg-curl"},
    {n:"Leg press machine",wu:2,s:2,reps:"8-12",rir:"1-0",rest:"2-3 min",sec:120,v:"leg-press-machine"},
    {n:"Smith hip thrust",wu:1,s:1,reps:"8-12",rir:"1-0",rest:"2-3 min",sec:120,v:"smith-hip-thrust"},
    {n:"Adductors machine",wu:1,s:2,reps:"8-12",rir:"1-0",rest:"2-3 min",sec:120,v:"adductors-machine"},
    {n:"Smith standing calf raises",wu:1,s:3,reps:"8-12",rir:"1-0",rest:"2-3 min",sec:120,v:"smith-standing-calf-raises"},
    {n:"Cable lateral raises W.H",wu:1,s:2,reps:"6-10",rir:"1-0",rest:"1.5-2 min",sec:90,v:"cable-lateral-raises-w-h"},
    {n:"Cable torso rotation",wu:1,s:2,reps:"8-12",rir:"1-0",rest:"1.5-2 min",sec:90,v:"cable-torso-rotation"},
    {n:"Abdominal crunches",wu:0,s:3,reps:"8-12",rir:"1-0",rest:"1.5-2 min",sec:90,v:"abdominal-crunches"}]},
  d4:{label:"day 4",ex:[
    {n:"T bar machine",wu:1,s:2,reps:"6-10",rir:"1-0",rest:"2-3 min",sec:120,v:"t-bar-machine"},
    {n:"DB flat press",wu:1,s:2,reps:"6-10",rir:"1-0",rest:"2-3 min",sec:120,v:"db-flat-press"},
    {n:"Wide grip latpulldown",wu:1,s:1,reps:"8-12",rir:"1-0",rest:"2-3 min",sec:120,v:"wide-grip-latpulldown"},
    {n:"Smith incline shoulder press",wu:0,s:1,reps:"6-10",rir:"1-0",rest:"2-3 min",sec:120,v:"smith-incline-shoulder-press"},
    {n:"Close grip seated row",wu:0,s:2,reps:"8-12",rir:"1-0",rest:"2-3 min",sec:120,v:"close-grip-seated-row"},
    {n:"Lateral raises machine",wu:1,s:3,reps:"10-12",rir:"1-0",rest:"1.5-2 min",sec:90,v:"lateral-raises-machine"},
    {n:"DB preacher curl",wu:1,s:2,reps:"8-12",rir:"1-0",rest:"1.5-2 min",sec:90,v:"db-preacher-curl"},
    {n:"Rope triceps pushdown",wu:1,s:2,reps:"8-12",rir:"1-0",rest:"1.5-2 min",sec:90,v:"rope-triceps-pushdown"}]},
  d5:{label:"day 5",ex:[
    {n:"RDLs",wu:2,s:3,reps:"8-12",rir:"1-0",rest:"2-3 min",sec:120,v:"rdls"},
    {n:"Hack squat machine",wu:1,s:2,reps:"6-10",rir:"1-0",rest:"2-3 min",sec:120,v:"hack-squat-machine"},
    {n:"Leg extension machine",wu:0,s:3,reps:"8-12",rir:"1-0",rest:"2-3 min",sec:120,v:"leg-extension-machine"},
    {n:"Lying leg curl",wu:0,s:2,reps:"6-10",rir:"1-0",rest:"2-3 min",sec:120,v:"lying-leg-curl"},
    {n:"Adductors machine",wu:1,s:2,reps:"8-12",rir:"1-0",rest:"2-3 min",sec:120,v:"adductors-machine"},
    {n:"DB wrist flexion",wu:1,s:2,reps:"10-12",rir:"1-0",rest:"2-3 min",sec:120,v:"db-wrist-flexion"},
    {n:"Smith standing calf raises",wu:1,s:3,reps:"8-12",rir:"1-0",rest:"1.5-2 min",sec:90,v:"smith-standing-calf-raises"}]}
};
export const CYCLE=["d1","d2","d3","rest","d4","d5","rest"];

/* the ~20 min split breakdown, played from the Guide */
export const INTRO="split-breakdown";

/* ════════════════════════════════════════════════════════════════
   COACH'S NOTES — every line from slides 2,3,4,5,6,19,20,22.
   EN as written; AR a full Egyptian-Arabic translation.
   ════════════════════════════════════════════════════════════════ */
export const C = {
  about:{
    h:{en:"About this version",ar:"عن النسخة دي"},
    ar:["حابب افكرك ان ده النسخة المعدلة من برنامج AR GYM بمجاميع و اختيارات تمارين تناسب اغلبكم و تساعدك انك تتطور عليها",
        "و ده فيديو شرح اكتر من ٢٠ دقيقة بشرحلك فيه السبليت و ازاي تصمم جدول تدريبي بالنظام ده بناءً علي نقاط ضعفك"],
    en:["Just a reminder — this is the updated version of the AR GYM program, with set volumes and exercise choices that suit most of you and help you keep progressing on it.",
        "And here's a video, more than 20 minutes, where I break down the split and show you how to build a training plan on this system based on your own weak points."]
  },
  intro:{
    h:{en:"Introduction",ar:"مقدمة"},
    en:["My goal is to help you grow natty, stay consistent, and keep your results long-term, not just get them once and lose them later",
        "I also want you to learn how to train on your own. Even after your subscription ends, you can still send me your plan to review and I'll make sure you're heading in the right direction.",
        "If you wanna share your plan with friends, go ahead, Just remember it's customized for you, so it might not fit them the same way."],
    ar:["هدفي اني اساعدك تكبر ناتشورال، وتفضل ثابت علي النظام، وتحافظ علي النتايج علي المدي الطويل، مش بس توصلها مرة وبعدين تضيع منك",
        "كمان عايزك تتعلم تتمرن لوحدك. حتي بعد ما الاشتراك بتاعك يخلص، تقدر تبعتلي الجدول بتاعك اراجعهولك واتأكد انك ماشي في الاتجاه الصح.",
        "ولو عايز تشارك الجدول مع صحابك، ولا يهمك. بس افتكر انه متظبط عليك انت، يبقي ممكن ميناسبهمش بنفس الشكل."]
  },
  gloss:{
    h:{en:"Glossary",ar:"المصطلحات"},
    items:[
      {k:"wu",t:{en:"Warming up sets",ar:"مجاميع الاحماء"},
       d:{en:"Light weight, get your body ready, not included in your weekly volume. You'll see them written as W.U Sets",
          ar:"وزن خفيف، تجهز بيه جسمك، ومش محسوبة في الفوليوم الاسبوعي بتاعك. هتلاقيها مكتوبة W.U Sets"}},
      {k:"ws",t:{en:"Working sets",ar:"المجاميع الفعلية"},
       d:{en:"These are the actual working sets counted in your training volume for the plan, warm-up sets don't count at all",
          ar:"دي المجاميع الحقيقية اللي بتتحسب في فوليوم التمرين في الجدول، ومجاميع الاحماء مش بتتحسب خالص"}},
      {k:"bo",t:{en:"Back off sets",ar:"الـ Back off sets"},
       d:{en:"If you see them in your plan, it means on your last set, drop the weight by 15-20% and go all the way to failure.",
          ar:"لو لقيتها في الجدول بتاعك، معناها ان في اخر مجموعة تنزّل الوزن ١٥-٢٠٪ وتروح للفشل علي الاخر."}},
      {k:"rir",t:{en:"RIR",ar:"الـ RIR"},
       d:{en:"how many reps you've got left in the tank before hitting failure. Basically, how many reps you could still do before you literally can't move the weight anymore.",
          ar:"كام عدة لسه فاضلة معاك قبل ما توصل للفشل. يعني ببساطة كام عدة كنت لسه تقدر تعملها قبل ما الوزن ميتحركش معاك خالص."}},
      {k:"su",t:{en:"Supersets",ar:"الـ Supersets"},
       d:{en:"two exercises back-to-back with zero rest.",ar:"تمرينين ورا بعض من غير راحة خالص."}},
      {k:"pr",t:{en:"Partials reps",ar:"الـ Partials reps"},
       d:{en:"short-range reps after you hit failure. If you can't do full range reps anymore, keep pushing halves or quarters until the weight doesn't move, only do this if I specifically ask for it.",
          ar:"عدات بمدي حركة قصير بعد ما توصل للفشل. لو مبقتش قادر تعمل عدات بمدي كامل، كمّل نص عدة او ربع عدة لحد ما الوزن ميتحركش، وماتعملش ده غير لما اقولك عليه بالتحديد."}}
    ]
  },
  tips:{
    h:{en:"Tips",ar:"نصايح"},
    items:[
      {k:"warm",en:"Take your warm-up sets slow no rushing. Stick to the same rep range as your main lift, just lighter weights",
       ar:"خد مجاميع الاحماء بتاعتك بالراحة من غير استعجال. التزم بنفس عدد العدات بتاع التمرين الاساسي، بس بأوزان اخف"},
      {k:"film",en:"Record one set per exercise and send it on check-in day, just to make sure your form's right.",
       ar:"صوّر مجموعة واحدة من كل تمرين وابعتهالي يوم الـ check-in، عشان بس نتأكد ان الفورم بتاعك صح."},
      {k:"load",en:"Pick weights that challenge you but still let you hit your reps with clean form. If you're flying past the rep range, it's too light",
       ar:"اختار اوزان تتحداك بس برضه تخليك تكمّل العدات بفورم نضيف. لو بتعدّي الـ rep range بسهولة، يبقي الوزن خفيف عليك"},
      {k:"stick",en:"Stick to your program, exercise selection and order stop switching things up every week. Real gains happen when your body starts adapting",
       ar:"التزم بالبرنامج بتاعك، باختيار التمارين وترتيبهم، وبطل تغيّر كل اسبوع. النتايج الحقيقية بتيجي لما جسمك يبدأ يتأقلم"},
      {k:"rest",en:"Rest days matter, even if you feel good, Take a rest.",
       ar:"ايام الراحة مهمة، حتي لو حاسس انك كويس، خد راحة."},
      {k:"log",en:"Log your weights and reps. Don't say “I'll remember them” — you won't",
       ar:"سجّل الاوزان والعدات بتاعتك. ماتقولش “هافتكرهم” — مش هتفتكرهم"}
    ]
  },
  split:{
    h:{en:"Training split",ar:"تقسيمة التمرين"},
    en:["Your training program doesn't have to fit perfectly into 7 days – forget the idea of a “weekly” schedule.",
        "It's totally fine if your cycle takes 8 or even 9 days.",
        "What matters most is that you follow the plan in the given order exactly as it's written."],
    ar:["البرنامج بتاعك مش لازم يتظبط بالظبط علي ٧ ايام – انسي فكرة الجدول “الاسبوعي”.",
        "عادي جدا لو الدورة بتاعتك خدت ٨ او حتي ٩ ايام.",
        "الاهم من ده كله انك تمشي علي الجدول بالترتيب اللي مكتوب بالظبط."]
  },
  cardio:{
    h:{en:"Cardio",ar:"الكارديو"},
    when:{en:"Post-workout",ar:"بعد التمرين"},
    type:{en:"Treadmill",ar:"مشاية"},
    dur:{en:"20",ar:"٢٠"},
    notes:{en:"speed 4 incline 10",ar:"سرعة ٤ ميلان ١٠"},
    lbl:{when:{en:"When",ar:"امتي"},type:{en:"Type",ar:"النوع"},dur:{en:"Duration",ar:"المدة"},notes:{en:"Notes",ar:"ملاحظات"}},
    stepsH:{en:"Daily steps",ar:"الخطوات اليومية"},
    steps:{en:"You can track your daily steps using the training app on your iPhone, or any app you can download from the App Store or Google Play, or you can track it through your Apple Watch.",
           ar:"تقدر تتابع خطواتك اليومية من تطبيق التمرين اللي علي الايفون، او اي تطبيق تنزله من الـ App Store او Google Play، او تتابعها من الـ Apple Watch بتاعتك."},
    noTarget:{en:"No step target set in the plan",ar:"مفيش هدف خطوات محدد في الخطة"}
  },
  mistakes:{
    h:{en:"Cardio mistakes I don't want you to make",ar:"غلطات في الكارديو مش عايزك تعملها"},
    en:["Don't say “I'll save time and do cardio before my workout” just to finish faster — that's not the goal.",
        "Don't skip your cardio and say “I'll make it up tomorrow” — it doesn't work that way.",
        "Don't hold onto the treadmill handles while it's on an incline — that reduces the effort, tricks your body, and lowers the intensity I want from you."],
    ar:["ماتقولش “هاوفر وقت واعمل الكارديو قبل التمرين” عشان بس تخلص بدري — مش ده الهدف.",
        "ماتسيبش الكارديو وتقول “هاعوّضه بكره” — الموضوع مش ماشي كده.",
        "ماتمسكش في مساكة المشاية وهي مايلة — ده بيقلل المجهود، وبيضحك علي جسمك، وبينزّل الشدة اللي انا عايزها منك."]
  },
  closing:{
    h:{en:"I'm confident you can do it",ar:"انا واثق انك تقدر"},
    en:["You've got a solid training program, everything you need is right here.",
        "A plan built just for you, Now it's all about your consistency, stay locked in, and those transformation pics are gonna hit hard soon"],
    ar:["معاك برنامج تدريبي قوي، وكل اللي محتاجه موجود هنا.",
        "جدول متعمل مخصوص ليك، ودلوقتي الموضوع كله علي الالتزام بتاعك، فضل ثابت، وصور الترانسفورميشن هتبقي مولعة قريب"]
  }
};

/* ── UI strings ─────────────────────────────────────────────────── */
export const T={
  today:{en:"Today",ar:"النهاردة"},guide:{en:"Guide",ar:"الدليل"},history:{en:"History",ar:"السجل"},
  nextup:{en:"Next up",ar:"الجاي"},inprog:{en:"In progress",ar:"شغال دلوقتي"},
  start:{en:"Start workout",ar:"ابدأ التمرين"},resume:{en:"Resume workout",ar:"كمّل التمرين"},
  finish:{en:"Finish workout",ar:"انهي التمرين"},restday:{en:"Rest day",ar:"يوم راحة"},
  markrest:{en:"Mark rest day done",ar:"سجّل يوم الراحة"},
  slot:{en:"Day",ar:"يوم"},of:{en:"of",ar:"من"},
  exs:{en:"exercises",ar:"تمارين"},wsets:{en:"working sets",ar:"مجموعة فعلية"},
  wu:{en:"W.U sets",ar:"مجاميع احماء"},work:{en:"Working sets",ar:"المجاميع الفعلية"},
  rir:{en:"RIR",ar:"RIR"},rest:{en:"Rest",ar:"راحة"},reps:{en:"reps",ar:"عدة"},
  watch:{en:"Watch",ar:"الفيديو"},novid:{en:"No demo",ar:"مفيش فيديو"},
  hide:{en:"Hide",ar:"اقفل"},
  novidmsg:{en:"The plan doesn't include a demo video for this exercise.",ar:"الخطة مفيهاش فيديو للتمرين ده."},
  coachdemo:{en:"Coach's demo",ar:"شرح الكوتش"},
  lasttime:{en:"Last",ar:"اخر مرة"},
  sets:{en:"Sets",ar:"المجاميع"},volume:{en:"Volume",ar:"الحمل الكلي"},time:{en:"Time",ar:"الوقت"},
  done:{en:"Done",ar:"تم"},skip:{en:"Skip",ar:"تخطي"},resting:{en:"Rest timer",ar:"عداد الراحة"},
  golift:{en:"Go",ar:"يلا"},
  cardiodone:{en:"Cardio done",ar:"خلصت الكارديو"},
  minutes:{en:"min",ar:"دقيقة"},
  close:{en:"Close",ar:"اقفل"},
  watchintro:{en:"Watch the split breakdown",ar:"اتفرج علي شرح السبليت"},
  introsub:{en:"min · split breakdown",ar:"دقيقة · شرح السبليت"},   /* shown after the video's length */
  nohist:{en:"Nothing logged yet. Your finished workouts land here.",ar:"لسه مفيش حاجة متسجلة. التمارين اللي بتخلصها هتظهر هنا."},
  firstlog:{en:"First log",ar:"اول تسجيل"},
  sessions:{en:"workouts logged",ar:"تمرين متسجل"},
  progress:{en:"logged",ar:"متسجل"},
  cyclepos:{en:"Cycle position",ar:"مكانك في الدورة"},
  savedlocal:{en:"Saved on this device",ar:"متحفظ على الجهاز ده"},
  quota:{en:"Storage is full — delete some old workouts to log new ones.",ar:"المساحة اتملت — امسح تمارين قديمة عشان تسجل جديد."},
  wrote:{en:"Great work. Logged.",ar:"شغل جامد. اتسجل."},
  srcnote:{en:"Transcribed from the AR GYM program deck — slides 2–22. Exercise videos are the coach's own demos and play offline once downloaded.",
           ar:"منقول من ملف برنامج AR GYM — سلايد ٢ لـ ٢٢. فيديوهات التمارين هي شرح الكوتش نفسه، وبتشتغل من غير نت بعد ما تنزّلها."},
  unit:{en:"Unit",ar:"الوحدة"},

  /* offline videos */
  offline:{en:"Offline videos",ar:"الفيديوهات من غير نت"},
  offlinesub:{en:"Download the demos once and they play at the gym with no signal.",
              ar:"نزّل الفيديوهات مرة واحدة وهتشتغل في الجيم حتي لو مفيش نت."},
  dlall:{en:"Download all videos",ar:"نزّل كل الفيديوهات"},
  dlday:{en:"Download this day",ar:"نزّل اليوم ده"},
  dlintro:{en:"Download the split breakdown",ar:"نزّل فيديو شرح السبليت"},
  introname:{en:"Split breakdown",ar:"شرح السبليت"},
  notdl:{en:"This video isn't downloaded yet — connect to the internet to watch or download it.",
         ar:"الفيديو ده لسه متنزلش — اتصل بالنت عشان تتفرج عليه او تنزّله."},
  dling:{en:"Downloading",ar:"بينزّل"},
  dldone:{en:"Downloaded",ar:"متنزّل"},
  dlfail:{en:"Download stopped — check your connection and try again.",ar:"التنزيل وقف — اتأكد من النت وجرّب تاني."},
  dlnone:{en:"Offline downloads aren't supported in this browser.",ar:"المتصفح ده مش بيدعم التنزيل للاستخدام من غير نت."},
  videos:{en:"videos",ar:"فيديو"},
  storage:{en:"Storage used",ar:"المساحة المستخدمة"},
  avail:{en:"available offline",ar:"متاح من غير نت"},

  /* backup */
  backup:{en:"Backup",ar:"نسخة احتياطية"},
  backupsub:{en:"Your log lives only on this phone. Export a backup now and then, and import it if you switch devices.",
             ar:"السجل بتاعك متحفظ علي الموبايل ده بس. خد نسخة احتياطية كل فترة، ورجّعها لو غيرت الجهاز."},
  exportb:{en:"Export backup",ar:"صدّر نسخة احتياطية"},
  importb:{en:"Import backup",ar:"رجّع نسخة احتياطية"},
  imported:{en:"Backup imported",ar:"النسخة الاحتياطية رجعت"},
  importedmsg:{en:"workouts added to your history.",ar:"تمرين اتضاف للسجل بتاعك."},
  importbad:{en:"That file isn't an AR GYM backup.",ar:"الملف ده مش نسخة احتياطية من AR GYM."},

  /* install + update */
  /* ⁦…⁩ isolate the English UI names inside the Arabic sentence */
  install:{en:"Install AR GYM: tap Share, then “Add to Home Screen”.",
           ar:"ثبّت ⁦AR GYM⁩: دوس علي ⁦Share⁩ وبعدين “⁦Add to Home Screen⁩”."},
  dismiss:{en:"Dismiss",ar:"اقفل"},
  update:{en:"Update available — tap to refresh",ar:"فيه تحديث جديد — دوس عشان تحدّث"}
};
