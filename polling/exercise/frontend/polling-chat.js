const chat = document.getElementById("chat");
const msgs = document.getElementById("msgs");

// let's store all current messages here
let allChat = [];

// the interval to poll at in milliseconds
const INTERVAL = 3000;

// a submit listener on the form in the HTML
chat.addEventListener("submit", function (e) {
  e.preventDefault();
  postNewMsg(chat.elements.user.value, chat.elements.text.value);
  chat.elements.text.value = "";
});

const postNewMsg = async (user, text) => {
  // post to /poll a new message
  const data = {
    user,
    text,
  };

  const options = {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
  };

  const res = await fetch("/poll", options);
  const json = await res.json();
};

const render = () => {
  // as long as allChat is holding all current messages, this will render them
  // into the ui. yes, it's inefficent. yes, it's fine for this example
  const html = allChat.map(({ user, text, time, id }) =>
    template(user, text, time, id)
  );

  msgs.innerHTML = html.join("\n");
};

const getNewMsgs = async () => {
  // poll the server
  let json;
  try {
    const res = await fetch("/poll");
    json = await res.json();

    if (res.status >= 400) {
      throw new Error("request failed: ", res.status);
    }

    allChat = json.msgs;
    render();

    failedTries = 0;
  } catch (e) {
    // back off could would go here
    console.error("polling error", e);
    failedTries++;
  }
  // allChat = json.msgs;
  // render();
  // setTimeout(getNewMsgs, INTERVAL);
};

// given a user and a msg, it returns an HTML string to render to the UI
const template = (user, msg) =>
  `<li class="collection-item"><span class="badge">${user}</span>${msg}</li>`;

// make the first request
//getNewMsgs();

const BACKOFF = 5000;
let timeToMakeNextRequest = 0;
let failedTries = 0;
const rafTimer = async (time) => {
  if (timeToMakeNextRequest <= time) {
    await getNewMsgs();
    timeToMakeNextRequest = time + INTERVAL + failedTries * BACKOFF;
  }

  requestAnimationFrame(rafTimer);
};

requestAnimationFrame(rafTimer);
