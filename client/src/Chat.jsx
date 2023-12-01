/* eslint-disable react/jsx-no-target-blank */
import { useContext, useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import { UserContext } from "./UserContext";
import { uniqBy } from "lodash";
import axios from "axios";
import Contact from "./Contact";

const Chat = () => {
  // eslint-disable-next-line no-unused-vars
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [offlinePeople, setOfflinePeople] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessageText, setNewMessageText] = useState("");
  // eslint-disable-next-line no-unused-vars
  const { username, id, setId, setContextUsername } = useContext(UserContext);
  const [messages, setMessages] = useState([]);
  const divUnderMessagesRef = useRef();

  // useEffect(() => {
  //   connectToWs();
  // }, []);

  // function connectToWs() {
  //   const ws = new WebSocket("ws://localhost:5000");
  //   setWs(ws);
  //   ws.addEventListener("message", handleMessage);
  //   ws.addEventListener("close", () => {
  //     setTimeout(() => {
  //       console.log("Disconnected. Trying to reconnect");
  //       connectToWs();
  //     }, 1000);
  //   });
  // }
  useEffect(() => {
    const ws = new WebSocket("wss://chatterbox-8i4n.onrender.com");
    // const ws = new WebSocket("ws://localhost:8000");
    setWs(ws);
    ws.addEventListener("message", handleMessage);

    return () => {
      ws.removeEventListener("message", handleMessage);
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  function logout() {
    axios.post("/logout").then(() => {
      ws.close();
      setWs(null);
      setId(null);
      setContextUsername(null);
    });
  }

  function showOnlinePeople(peopleArray) {
    const people = {};
    peopleArray.forEach(({ userId, username }) => {
      if (userId && username) {
        //i noticed that even when connections are killed, previous online
        //connections are returned with undefined params
        people[userId] = username;
      }
    });

    setOnlinePeople(people);
  }

  function handleMessage(e) {
    const messageData = JSON.parse(e.data);
    if ("online" in messageData) {
      showOnlinePeople(messageData.online);
    } else if ("text" in messageData) {
      if (messageData.sender === selectedUserId) {
        setMessages((prev) => [
          ...prev,
          {
            ...messageData,
          },
        ]);
      }
    }
  }

  function sendMessage(e, file = null) {
    if (e) e.preventDefault();

    ws.send(
      JSON.stringify({
        recipient: selectedUserId,
        text: newMessageText,
        file,
      })
    );

    if (file) {
      axios.get("/messages/" + selectedUserId).then((res) => {
        setMessages(res.data);
      });
    } else {
      setNewMessageText("");
      setMessages((prev) => [
        ...prev,
        {
          text: newMessageText,
          sender: id,
          recipient: selectedUserId,
          _id: Date.now(),
        },
      ]);
    }
  }

  function sendFile(ev) {
    const reader = new FileReader();
    reader.readAsDataURL(ev.target.files[0]);
    reader.onload = () => {
      sendMessage(null, {
        name: ev.target.files[0].name,
        data: reader.result,
      });
    };
  }

  function fileIsImage(fileName) {
    const imageExtensions = ["png", "jpg", "jpeg", "gif", "bmp"];
    //We are sure the format will always be filename.ext
    const fileExtension = fileName.split(".")[1];

    return imageExtensions.includes(fileExtension.toLowerCase()) ? true : false;
  }

  useEffect(() => {
    const div = divUnderMessagesRef.current;
    if (div) {
      div.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  useEffect(() => {
    if (selectedUserId) {
      axios.get("/messages/" + selectedUserId).then((res) => {
        setMessages(res.data);
      });
    }
  }, [selectedUserId]);

  //online people will change as users exit and join the connection
  useEffect(() => {
    axios.get("/people").then((res) => {
      const offlinePeopleArr = res.data
        .filter((p) => p._id !== id) //should not include me
        //offline people are all people who are not in onlinepeople
        .filter((p) => !Object.keys(onlinePeople).includes(p._id));
      const offlinePeople = {};
      offlinePeopleArr.forEach((p) => {
        offlinePeople[p._id] = p.username;
      });
      setOfflinePeople(offlinePeople);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlinePeople]);

  const onlinePeopleExclOurUser = { ...onlinePeople };
  delete onlinePeopleExclOurUser[id];

  const messagesWithoutDupes = uniqBy(messages, "_id");

  return (
    <div className="flex h-screen">
      <div className="bg-white w-1/5 flex flex-col">
        <div className="flex-grow">
          <Logo />
          <div className="text-left p-4">
            <span className="mr-2 text-gray-500 flex items-center">
              🎉 Welcome, <b className="pl-3"> {username}</b>
            </span>
          </div>
          {Object.keys(onlinePeopleExclOurUser).map((userId) => {
            return (
              <Contact
                key={userId}
                userId={userId}
                username={onlinePeopleExclOurUser[userId]}
                onClick={() => setSelectedUserId(userId)}
                selected={userId === selectedUserId}
                online={true}
              />
            );
          })}
          {Object.keys(offlinePeople).map((userId) => {
            return (
              <Contact
                key={userId}
                userId={userId}
                username={offlinePeople[userId]}
                onClick={() => setSelectedUserId(userId)}
                selected={userId === selectedUserId}
                online={false}
              />
            );
          })}
        </div>
        <div className="text-center flex items-center justify-center">
          <button
            className="p-2 w-full  bg-[#29ADB2] rounded-sm   text-sm text-white
          text-center
          "
            onClick={() => logout()}
          >
            Logout
          </button>
        </div>
      </div>
      <div className="bg-blue-50 w-4/5 p-2 flex flex-col">
        <div className="flex-grow">
          {!selectedUserId && (
            <div
              className="flex
          items-center justify-center h-full
          "
            >
              <div className="text-gray-400 w-1/3 text-lg flex flex-col items-center text-center">
                <img src="/woman.png" alt="" className="opacity-40 mb-2" />
                Select a person from the sidebar to chat with. Let your fingers
                do the talking.
              </div>
            </div>
          )}

          {selectedUserId && (
            <div className="relative h-full">
              <div className="overflow-y-scroll absolute inset-0">
                {messagesWithoutDupes.map((message, index) => {
                  // eslint-disable-next-line react/jsx-key
                  return (
                    <div
                      className={
                        message.sender === id ? "text-right" : "text-left"
                      }
                      key={index}
                    >
                      <div
                        className={
                          "text-left w-1/3 p-2 m-2 inline-block rounded-xl " +
                          (message.sender === id
                            ? "bg-orange-200 "
                            : "bg-blue-500 text-white")
                        }
                      >
                        {message.text}
                        {message.file && (
                          <div>
                            {fileIsImage(message.file) ? (
                              <div>
                                <a
                                  target="_blank"
                                  className="underline flex items-center gap-1"
                                  href={
                                    axios.defaults.baseURL +
                                    "/uploads/" +
                                    message.file
                                  }
                                >
                                  <img
                                    src={
                                      axios.defaults.baseURL +
                                      "/uploads/" +
                                      message.file
                                    }
                                    className="rounded-xl"
                                  />
                                </a>
                              </div>
                            ) : (
                              ""
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={divUnderMessagesRef}></div>
              </div>
            </div>
          )}
        </div>
        {selectedUserId && (
          <form className="flex gap-2" onSubmit={sendMessage}>
            <input
              type="text"
              className="bg-white border p-2 flex-grow rounded-sm"
              placeholder="Type your message"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
            />
            <label
              type="button"
              className="bg-gray-200
            p-2 rounded-sm border border-gray-300 cursor-pointer"
            >
              <input type="file" className="hidden" onChange={sendFile} />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                />
              </svg>
            </label>
            <button className="bg-blue-500 active:bg-green-300 p-2 text-white rounded-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Chat;
