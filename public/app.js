
"use strict";

/* =========================================
   DOPA — MAIN APPLICATION
========================================= */

const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];

const KEY = "dopa-meen-v1";

const defaults = {
  name: "",
  points: 0,
  screen: 0,
  goal: 120,
  streak: 0,
  completed: [],
  moods: [],
  rsvps: [],
  challenges: [],
  lastMood: "",
  lastActive: "",
  profile: null,
  guardian: false,
  nudges: true,
  lockReminder: false,
  quizAnswers: []
};

function load() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...defaults };
  }
}

let state = load();
let selectedMood = "";
let selectedQuest = null;
let selectedReward = null;
let activeFilter = "all";
let quizIndex = 0;
let quizAnswers = [];
let chatHistory = [];
let chatBusy = false;

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    toast("Could not save data. Browser storage may be full.", false);
  }
}

function toast(message, good = true) {
  const region = $("#toastRegion") || createToastRegion();
  const element = document.createElement("div");
  element.className = "toast" + (good ? " success" : "");
  element.textContent = message;
  region.append(element);
  setTimeout(() => element.remove(), 3000);
}

function createToastRegion() {
  const element = document.createElement("div");
  element.id = "toastRegion";
  element.className = "toast-region";
  document.body.append(element);
  return element;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[c]);
}

function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
}

function formatTime(minutes) {
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2,"0")}m`;
}

/* =========================================
   DATA
========================================= */

const quests = [
  {id:"sketch",name:"Sketch a 10-minute scene",desc:"Draw something near your window and notice the details around you.",category:"creative",icon:"🎨",time:10,points:50},
  {id:"music",name:"Make a tiny soundtrack",desc:"Learn a few notes or create your own little rhythm.",category:"creative",icon:"🎧",time:15,points:50},
  {id:"walk",name:"Take a mindful walk",desc:"Walk outside and notice five things you normally overlook.",category:"movement",icon:"🌿",time:20,points:100},
  {id:"stretch",name:"Stretch & reset",desc:"Take a few minutes to stretch and breathe.",category:"movement",icon:"🧘",time:8,points:50},
  {id:"read",name:"Read a few pages",desc:"Read a book, comic, or magazine without interruptions.",category:"calm",icon:"📖",time:15,points:50},
  {id:"puzzle",name:"Solve a little puzzle",desc:"Try sudoku, a crossword, or a Rubik's Cube.",category:"calm",icon:"🧩",time:12,points:50},
  {id:"cook",name:"Make a new snack",desc:"Prepare a simple snack and enjoy it away from your screen.",category:"creative",icon:"🥑",time:20,points:75},
  {id:"photography",name:"Find five interesting things",desc:"Take five photographs of interesting details around you.",category:"creative",icon:"📷",time:15,points:50},
  {id:"water",name:"Go get some fresh air",desc:"Step outside, breathe, and take a short break.",category:"movement",icon:"☀️",time:10,points:50}
];

const rewards = [
  {id:"book",name:"20% off Maliks",description:"A bookstore treat.",cost:500,icon:"📚"},
  {id:"smoothie",name:"Free smoothie",description:"A refreshing reward.",cost:400,icon:"🥤"},
  {id:"cinema",name:"Cinemall ticket deal",description:"Enjoy a film with friends.",cost:800,icon:"🎟️"}
];

const meetups = [
  {id:"art",name:"Beirut Art & Sketch Club",description:"A relaxed afternoon of drawing and creativity.",date:"Saturday · 3 PM",location:"Horsh Beirut",icon:"🎨"},
  {id:"hike",name:"Chouf Cedar Trail Walk",description:"A supervised walk among the cedars.",date:"Sunday · 9 AM",location:"Chouf",icon:"🥾"},
  {id:"games",name:"Board Game Afternoon",description:"Strategy games and new friends.",date:"Friday · 4 PM",location:"Beirut",icon:"🎲"},
  {id:"photo",name:"Street Photography Walk",description:"Explore colors and everyday stories.",date:"Saturday · 10 AM",location:"Downtown Beirut",icon:"📷"}
];

const nudges = [
  ["A tiny pause can change your day.","Take ten minutes to stretch and change your scenery."],
  ["Your attention is worth protecting.","Try finishing one thing before opening another."],
  ["Go where the sunlight is.","Fresh air and movement can make a screen-heavy day feel lighter."],
  ["You are more than your notifications.","Put your phone away during your next meal."],
  ["Make room for a real-world win.","Choose one small offline activity."]
];

/* =========================================
   NAVIGATION
========================================= */

function navigate(page) {
  $$(".page").forEach(p => p.classList.toggle("active",p.id === `page-${page}`));
  $$(".nav[data-page]").forEach(b => b.classList.toggle("active",b.dataset.page === page));
  $("#breadcrumb").textContent = page.toUpperCase();
  $("#sidebar").classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});
}

function bindNavigation() {
  document.addEventListener("click",e => {
    const button = e.target.closest("[data-page]");
    if (button) {
      e.preventDefault();
      navigate(button.dataset.page);
    }
  });

  $("#menuBtn").addEventListener("click",() => $("#sidebar").classList.toggle("open"));
}

/* =========================================
   DASHBOARD
========================================= */

function renderDashboard() {
  const name = state.name || "Explorer";
  const initial = name[0].toUpperCase();

  $("#welcomeName").textContent = name;
  $("#profileName").textContent = name;
  $("#avatar").textContent = initial;
  $("#topAvatar").textContent = initial;

  $("#points").textContent = state.points.toLocaleString();
  $("#rewardPoints").innerHTML = `${state.points.toLocaleString()} <small>POINTS</small>`;
  $("#screenStat").textContent = formatTime(state.screen);
  $("#screenLarge").textContent = formatTime(state.screen);
  $("#screenGoal").textContent = `Daily goal: ${formatTime(state.goal)}`;
  $("#streak").textContent = state.streak;

  const percentage = Math.min(100,Math.round(state.screen / state.goal * 100));
  const circumference = 477.5;

  $("#percentage").textContent = percentage + "%";
  $("#ring").style.strokeDashoffset = circumference - circumference * percentage / 100;

  $("#screenMessage").textContent =
    state.screen >= state.goal
      ? "Your goal has been reached. Consider taking a gentle break."
      : "Every intentional break is a win.";

  $("#today").textContent = new Date().toLocaleDateString(undefined,{
    weekday:"short",month:"short",day:"numeric"
  });

  $("#settingName").value = state.name;
  $("#settingGoal").value = state.goal;
  $("#nudgesEnabled").checked = state.nudges;
  $("#lockEnabled").checked = state.lockReminder;

  $("#guardianConsent").checked = state.guardian;

  $("#questCount").textContent = quests.filter(q => !state.completed.includes(q.id)).length;

  renderQuestCards($("#homeQuests"),quests.filter(q => !state.completed.includes(q.id)).slice(0,3));
}

/* =========================================
   PERSONALITY TEST — 10 QUESTIONS
========================================= */

const questions = [
  {
    q:"How do you recharge best offline?",
    a:[
      ["Sketching or making music","creative"],
      ["Outdoor sports and movement","movement"],
      ["Reading or solving puzzles","calm"]
    ]
  },
  {
    q:"Which afternoon sounds most exciting?",
    a:[
      ["Creating something from scratch","creative"],
      ["Going somewhere new","movement"],
      ["A quiet afternoon with a book","calm"]
    ]
  },
  {
    q:"What kind of reward feels best?",
    a:[
      ["Finishing an artwork","creative"],
      ["Achieving a physical goal","movement"],
      ["Solving a difficult problem","calm"]
    ]
  },
  {
    q:"When you have free time, you usually...",
    a:[
      ["Make, draw, build, or create","creative"],
      ["Move, explore, or play","movement"],
      ["Think, read, or learn","calm"]
    ]
  },
  {
    q:"Choose your ideal environment.",
    a:[
      ["An art studio","creative"],
      ["A park or sports field","movement"],
      ["A library or quiet room","calm"]
    ]
  },
  {
    q:"What motivates you most?",
    a:[
      ["Expressing myself","creative"],
      ["A new challenge","movement"],
      ["Understanding something deeply","calm"]
    ]
  },
  {
    q:"Pick a weekend activity.",
    a:[
      ["Photography or crafts","creative"],
      ["Hiking or cycling","movement"],
      ["Reading or board games","calm"]
    ]
  },
  {
    q:"How do you prefer to solve problems?",
    a:[
      ["Think outside the box","creative"],
      ["Try things practically","movement"],
      ["Analyze carefully","calm"]
    ]
  },
  {
    q:"What would you like to improve?",
    a:[
      ["Creativity and expression","creative"],
      ["Energy and fitness","movement"],
      ["Focus and concentration","calm"]
    ]
  },
  {
    q:"Choose the activity you would do right now.",
    a:[
      ["Draw something","creative"],
      ["Go outside","movement"],
      ["Solve a puzzle","calm"]
    ]
  }
];

function renderQuiz() {
  const q = questions[quizIndex];

  $("#quizStep").textContent = `QUESTION ${quizIndex+1} OF 10`;
  $("#quizPercent").textContent = `${(quizIndex+1)*10}%`;
  $("#quizBar").style.width = `${(quizIndex+1)*10}%`;
  $("#quizQuestion").textContent = q.q;

  $("#quizOptions").innerHTML = q.a.map((option,index) => `
    <button class="quiz-option ${quizAnswers[quizIndex] === index ? "selected" : ""}"
      data-answer="${index}">
      ${escapeHTML(option[0])}
    </button>
  `).join("");

  $("#quizBack").disabled = quizIndex === 0;
  $("#quizNext").disabled = quizAnswers[quizIndex] === undefined;
  $("#quizNext").textContent = quizIndex === 9 ? "See my profile →" : "Next question →";
}

function finishQuiz() {
  const counts = {creative:0,movement:0,calm:0};

  quizAnswers.forEach((answer,index) => {
    counts[questions[index].a[answer][1]]++;
  });

  const type = Object.entries(counts).sort((a,b) => b[1]-a[1])[0][0];

  const profiles = {
    creative:["The Creative Explorer","You enjoy self-expression, imagination, and making things. Creative activities may be especially enjoyable for you."],
    movement:["The Active Explorer","You enjoy movement, outdoor experiences, and new challenges. Activities that get you moving may be especially enjoyable."],
    calm:["The Thoughtful Explorer","You enjoy concentration, discovery, and quieter experiences. Puzzles, reading, and reflective activities may suit you."]
  };

  state.profile = {type,counts};
  state.quizAnswers = quizAnswers;
  save();

  $("#quizPanel").classList.add("hidden");
  $("#quizResult").classList.remove("hidden");

  $("#profileType").textContent = profiles[type][0];
  $("#profileDescription").textContent = profiles[type][1];

  const suggestions = quests.filter(q => q.category === type);

  $("#profileSuggestions").innerHTML = suggestions.map(q =>
    `<div class="earn-row">${q.icon} ${escapeHTML(q.name)} <b>${q.points} pts</b></div>`
  ).join("");

  toast("Your personality profile is ready!");
}

function resetQuiz() {
  quizIndex = 0;
  quizAnswers = [];
  $("#quizPanel").classList.remove("hidden");
  $("#quizResult").classList.add("hidden");
  renderQuiz();
}

/* =========================================
   QUEST SYSTEM
========================================= */

function renderQuestCards(container,list) {
  container.innerHTML = list.map(q => {
    const done = state.completed.includes(q.id);

    return `
      <article class="quest-card">
        <div class="quest-art art-${q.category === "movement" ? "move" : q.category}">
          ${q.icon}
        </div>
        <h3>${escapeHTML(q.name)}</h3>
        <p>${escapeHTML(q.desc)}</p>
        <div class="quest-card-foot">
          <span class="quest-points">✧ ${q.points} pts</span>
          <span class="quest-duration">${q.time} min</span>
          <button class="card-action" data-quest="${q.id}">
            ${done ? "Completed ✓" : "Start →"}
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function renderQuests() {
  const list = quests.filter(q =>
    activeFilter === "all" || q.category === activeFilter
  );

  renderQuestCards($("#allQuests"),list);
  renderQuestCards($("#homeQuests"),quests.filter(q => !state.completed.includes(q.id)).slice(0,3));
}

function openQuest(id) {
  const q = quests.find(item => item.id === id);
  if (!q) return;

  if (state.completed.includes(id)) {
    toast("This quest is already completed.",false);
    return;
  }

  selectedQuest = id;

  $("#modalCategory").textContent = q.category.toUpperCase() + " QUEST";
  $("#modalTitle").textContent = q.name;
  $("#modalDescription").textContent = q.desc;
  $("#modalDuration").textContent = q.time + " MIN";
  $("#modalPoints").textContent = "+" + q.points + " PTS";

  $("#questModal").showModal();
}

function completeQuest() {
  const q = quests.find(item => item.id === selectedQuest);

  if (!q || state.completed.includes(q.id)) return;

  state.completed.push(q.id);
  state.points += q.points;

  save();
  closeDialog("questModal");
  updateUI();

  toast(`Quest complete! You earned ${q.points} points.`);
}

/* =========================================
   REWARDS
========================================= */

function renderRewards() {
  $("#rewardGrid").innerHTML = rewards.map(r => `
    <article class="reward-card">
      <div class="reward-visual">${r.icon}</div>
      <h3>${escapeHTML(r.name)}</h3>
      <p>${escapeHTML(r.description)}</p>
      <div class="reward-card-foot">
        <span class="reward-cost">${r.cost} pts</span>
        <button data-reward="${r.id}" ${state.points < r.cost ? "disabled" : ""}>
          Redeem
        </button>
      </div>
    </article>
  `).join("");
}

function openReward(id) {
  const r = rewards.find(item => item.id === id);
  if (!r) return;

  if (state.points < r.cost) {
    toast("You need more points.",false);
    return;
  }

  selectedReward = id;

  $("#rewardModalTitle").textContent = r.name;
  $("#rewardModalDescription").textContent =
    `Redeeming this demo reward will cost ${r.cost} points. No real voucher is issued.`;

  $("#rewardModal").showModal();
}

function redeemReward() {
  const r = rewards.find(item => item.id === selectedReward);

  if (!r || state.points < r.cost) return;

  state.points -= r.cost;

  save();
  closeDialog("rewardModal");
  updateUI();

  toast("Reward redeemed successfully in the demo!");
}

/* =========================================
   MOOD JOURNAL
========================================= */

function renderMoods() {
  const emojis = {
    Great:"😄",Good:"🙂",Okay:"😐",Low:"😕",Stressed:"😣"
  };

  $("#moodHistory").innerHTML = state.moods.length
    ? state.moods.slice(0,10).map(m => `
      <div class="history-item">
        <span>${emojis[m.mood] || "♡"}</span>
        <div><b>${escapeHTML(m.mood)}</b><p>${escapeHTML(m.note || "No note.")}</p></div>
        <time>${escapeHTML(m.date)}</time>
      </div>
    `).join("")
    : '<p class="disclaimer">Your check-ins will appear here.</p>';
}

function saveMood() {
  if (!selectedMood) {
    toast("Select a mood first.",false);
    return;
  }

  const today = todayKey();

  state.moods.unshift({
    mood:selectedMood,
    note:$("#journalText").value.trim(),
    date:new Date().toLocaleDateString(undefined,{month:"short",day:"numeric"}),
    day:today
  });

  state.moods = state.moods.slice(0,50);

  if (state.lastMood !== today) {
    state.points += 10;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate()-1);

    state.streak = state.lastActive === todayKey(yesterday)
      ? state.streak+1 : 1;

    state.lastMood = today;
    state.lastActive = today;
  }

  selectedMood = "";
  $("#journalText").value = "";

  $$("#moodOptions button").forEach(b => b.classList.remove("selected"));
  save();
  updateUI();

  toast("Your mood check-in has been saved.");
}

/* =========================================
   CHALLENGES
========================================= */

function renderChallenges() {
  $("#challengeList").innerHTML = state.challenges.map(c => `
    <div class="challenge-item">
      <span>♧ ${escapeHTML(c.name)}</span>
      <b>${c.done ? "Completed ✓" : "In progress"}</b>
    </div>
  `).join("") || '<p class="disclaimer">No additional challenges yet.</p>';
}

function completeChallenge() {
  if (state.challenges.some(c => c.id === "daily-walk" && c.done)) {
    toast("You already completed your side!");
    return;
  }

  let challenge = state.challenges.find(c => c.id === "daily-walk");

  if (!challenge) {
    challenge = {id:"daily-walk",name:"20-minute outdoor walk",done:false};
    state.challenges.push(challenge);
  }

  challenge.done = true;
  state.points += 50;

  save();
  updateUI();
  renderChallenges();

  toast("Your side is complete! +50 points. The other participant must still finish.");
}

function inviteFriend() {
  const name = $("#friendName").value.trim();

  if (!name) {
    toast("Enter a friend's nickname.",false);
    return;
  }

  state.challenges.push({
    id:"friend-"+Date.now(),
    name:`Offline challenge with ${name}`,
    done:false
  });

  $("#friendName").value = "";
  save();
  renderChallenges();

  toast("Demo challenge created.");
}

/* =========================================
   COMMUNITY
========================================= */

function renderMeetups() {
  $("#meetupGrid").innerHTML = meetups.map(m => {
    const interested = state.rsvps.includes(m.id);

    return `
      <article class="meetup-card">
        <div class="meetup-icon">${m.icon}</div>
        <h3>${escapeHTML(m.name)}</h3>
        <p>${escapeHTML(m.description)}</p>
        <small>${escapeHTML(m.date)} · ${escapeHTML(m.location)}</small>
        <button class="outline-button" data-rsvp="${m.id}">
          ${interested ? "Interested ✓" : "I'm interested ↗"}
        </button>
      </article>
    `;
  }).join("");
}

function toggleRSVP(id) {
  if (state.rsvps.includes(id)) {
    state.rsvps = state.rsvps.filter(x => x !== id);
  } else {
    state.rsvps.push(id);
  }

  save();
  renderMeetups();
  toast("Your interest has been updated locally.");
}

/* =========================================
   NUDGES & SCREEN TIME
========================================= */

function newNudge() {
  const n = nudges[Math.floor(Math.random()*nudges.length)];

  $("#nudgeTime").textContent = new Date().toLocaleTimeString([],{
    hour:"2-digit",minute:"2-digit"
  });

  $("#nudgeTitle").textContent = n[0];
  $("#nudgeText").textContent = n[1];
}

function addScreenTime(event) {
  event.preventDefault();

  const minutes = Number($("#minutesInput").value);

  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 720) {
    toast("Enter between 1 and 720 minutes.",false);
    return;
  }

  state.screen += minutes;

  save();
  closeDialog("screenModal");
  updateUI();

  if (state.screen >= state.goal && state.lockReminder) {
    toast("Your screen-time goal has been reached. Consider taking a break.");
  } else {
    toast("Screen time logged.");
  }
}

/* =========================================
   MABSOUTA AI
========================================= */

function addMessage(text,role) {
  const message = document.createElement("div");
  message.className = "message " + role;
  message.textContent = text;

  $("#chatMessages").append(message);
  $("#chatMessages").scrollTop = $("#chatMessages").scrollHeight;

  return message;
}

async function askMabsouta(text) {
  if (chatBusy || !text.trim()) return;

  chatBusy = true;
  $("#sendChat").disabled = true;

  addMessage(text,"user");

  const typing = addMessage("Mabsouta is thinking...","bot typing");

  try {
    const response = await fetch("/api/mabsouta",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        message:text,
        history:chatHistory.slice(-10),
        profile:state.profile?.type || "Not completed",
        completedQuests:state.completed.length
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "AI request failed.");
    }

    typing.remove();

    const reply = data.reply || "I'm here. Tell me a little more.";

    addMessage(reply,"bot");

    chatHistory.push(
      {role:"user",content:text},
      {role:"assistant",content:reply}
    );

    chatHistory = chatHistory.slice(-20);

  } catch(error) {
    typing.remove();

    addMessage(
      "I couldn't connect right now. Please check your internet connection and the server configuration. You can try again in a moment.",
      "bot"
    );

    console.error(error);

  } finally {
    chatBusy = false;
    $("#sendChat").disabled = false;
    $("#chatInput").focus();
  }
}

function sendChat(event) {
  event.preventDefault();

  const input = $("#chatInput");
  const text = input.value.trim();

  if (!text) return;

  input.value = "";
  askMabsouta(text);
}

function clearChat() {
  chatHistory = [];

  $("#chatMessages").innerHTML = `
    <div class="message bot">
      Marhaba! I'm Mabsouta. ♡<br><br>
      How are you feeling today?
    </div>
  `;
}

async function generateReport() {
  const output = $("#reportOutput");

  if (!state.moods.length) {
    output.textContent = "Complete some mood check-ins first to generate a report.";
    return;
  }

  output.textContent = "Mabsouta is preparing your report...";

  const moodSummary = state.moods.slice(0,30).map(m => ({
    mood:m.mood,
    note:m.note
  }));

  try {
    const response = await fetch("/api/mabsouta",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        mode:"report",
        message:"Create a short personal reflection based on these check-ins.",
        moods:moodSummary,
        screenMinutes:state.screen,
        completedQuests:state.completed.length
      })
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.error);

    output.textContent = data.reply;

  } catch(error) {
    output.textContent = "Couldn't generate the report. Check your AI server.";
  }
}

/* =========================================
   WEARABLE SIMULATION
========================================= */

function simulateWearable() {
  const heart = 60 + Math.floor(Math.random()*35);
  const hrv = 30 + Math.floor(Math.random()*45);

  $("#heartRate").textContent = heart + " BPM";
  $("#hrv").textContent = hrv + " ms";
  $("#stress").textContent =
    heart > 85 ? "Elevated indicator" :
    heart > 72 ? "Moderate indicator" : "Low indicator";

  toast("New simulated reading generated.");
}

function updateWatch() {
  $("#watchTime").textContent = new Date().toLocaleTimeString([],{
    hour:"2-digit",minute:"2-digit"
  });

  $("#watchPercent").textContent =
    Math.min(100,Math.round(state.screen/state.goal*100)) + "%";
}

/* =========================================
   SETTINGS & PRIVACY
========================================= */

function saveSettings() {
  const name = $("#settingName").value.trim();
  const goal = Number($("#settingGoal").value);

  if (!name || !Number.isInteger(goal) || goal < 30 || goal > 600) {
    toast("Enter a name and a goal between 30 and 600 minutes.",false);
    return;
  }

  state.name = name;
  state.goal = goal;
  state.nudges = $("#nudgesEnabled").checked;
  state.lockReminder = $("#lockEnabled").checked;

  save();
  updateUI();

  toast("Settings saved.");
}

function deleteData() {
  if (!confirm("Delete all Dopa information stored in this browser?")) return;

  localStorage.removeItem(KEY);
  state = {...defaults};

  selectedMood = "";
  quizAnswers = [];
  chatHistory = [];

  updateUI();
  renderChallenges();
  clearChat();
  navigate("home");

  $("#onboarding").showModal();

  toast("Local demo data deleted.");
}

function closeDialog(id) {
  const dialog = $("#" + id);
  if (dialog?.open) dialog.close();
}

/* =========================================
   EVENT HANDLERS
========================================= */

function bindEvents() {

  // Global delegated buttons
  document.addEventListener("click",e => {

    const quest = e.target.closest("[data-quest]");
    if (quest) return openQuest(quest.dataset.quest);

    const reward = e.target.closest("[data-reward]");
    if (reward) return openReward(reward.dataset.reward);

    const rsvp = e.target.closest("[data-rsvp]");
    if (rsvp) return toggleRSVP(rsvp.dataset.rsvp);

    const mood = e.target.closest("[data-mood]");
    if (mood) {
      selectedMood = mood.dataset.mood;

      $$("#moodOptions button, #quickMoods button").forEach(b =>
        b.classList.toggle("selected",b.dataset.mood === selectedMood)
      );
    }

    const close = e.target.closest("[data-close]");
    if (close) closeDialog(close.dataset.close);

    const answer = e.target.closest("[data-answer]");
    if (answer) {
      quizAnswers[quizIndex] = Number(answer.dataset.answer);
      renderQuiz();
    }
  });

  $("#logScreen").addEventListener("click",() => {
    $("#screenModal").showModal();
  });

  $("#screenForm").addEventListener("submit",addScreenTime);

  $("#completeQuest").addEventListener("click",completeQuest);
  $("#confirmReward").addEventListener("click",redeemReward);

  $("#newNudge").addEventListener("click",newNudge);

  $("#saveMood").addEventListener("click",saveMood);

  $("#quizNext").addEventListener("click",() => {
    if (quizAnswers[quizIndex] === undefined) return;

    if (quizIndex === 9) {
      finishQuiz();
    } else {
      quizIndex++;
      renderQuiz();
    }
  });

  $("#quizBack").addEventListener("click",() => {
    if (quizIndex > 0) {
      quizIndex--;
      renderQuiz();
    }
  });

  $("#retakeQuiz").addEventListener("click",resetQuiz);

  $("#questFilters").addEventListener("click",e => {
    const filter = e.target.closest("[data-filter]");
    if (!filter) return;

    activeFilter = filter.dataset.filter;

    $$("#questFilters .filter").forEach(b =>
      b.classList.toggle("active",b === filter)
    );

    renderQuests();
  });

  $("#completeChallenge").addEventListener("click",completeChallenge);
  $("#inviteFriend").addEventListener("click",inviteFriend);

  $("#newPrompt").addEventListener("click",() => {
    const prompts = [
      "What made you proud of yourself today?",
      "When did you feel most present?",
      "What would you like to change tomorrow?",
      "What is something you are grateful for?",
      "What is something you want to learn?"
    ];

    $("#journalPrompt").textContent =
      prompts[Math.floor(Math.random()*prompts.length)];
  });

  $("#chatForm").addEventListener("submit",sendChat);


  $$(".chat-suggestions button").forEach(button => {
    button.addEventListener("click",() => {
      askMabsouta(button.dataset.prompt);
    });
  });

  $("#clearChat").addEventListener("click",clearChat);

  $("#generateReport").addEventListener("click",generateReport);

  $("#simulateWearable").addEventListener("click",simulateWearable);

  $("#wearableInfo").addEventListener("click",() => {
    toast("Real integrations require a supported device and health-data permissions.");
  });

  $("#saveSettings").addEventListener("click",saveSettings);

  $("#saveConsent").addEventListener("click",() => {
    state.guardian = $("#guardianConsent").checked;
    save();
    toast("Local acknowledgement saved.");
  });

  $("#deleteData").addEventListener("click",deleteData);

  $("#notifications").addEventListener("click",() => {
    toast("You're all caught up. Take a breath.");
  });

  $("#onboardingForm").addEventListener("submit",e => {
    e.preventDefault();

    const name = $("#onboardName").value.trim();

    if (!name || !$("#privacyAccept").checked) return;

    state.name = name;

    save();
    closeDialog("onboarding");
    updateUI();

    toast(`Welcome to Dopa, ${name}!`);
  });
}

/* =========================================
   MAIN UPDATE
========================================= */

function updateUI() {
  renderDashboard();
  renderQuests();
  renderRewards();
  renderMoods();
  renderMeetups();
  renderChallenges();
  updateWatch();
}

function init() {
  bindNavigation();
  bindEvents();

  updateUI();
  renderQuiz();
  newNudge();

  if (!state.name) {
    $("#onboarding").showModal();
  }

  setInterval(updateWatch,30000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded",init,{once:true});
} else {
  init();
}
