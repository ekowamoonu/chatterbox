/* eslint-disable react/no-unescaped-entities */
import { useContext, useState } from "react";
import axios from "axios";
import { UserContext } from "./UserContext";

const RegisterAndLoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginOrRegister, setIsLoginOrRegister] = useState("login");
  const { setContextUsername, setId, loading } = useContext(UserContext);

  async function handleSubmit(e) {
    e.preventDefault();
    if (username !== "" && password !== "") {
      const url = isLoginOrRegister === "register" ? "/register" : "/login";
      const { data } = await axios.post(url, { username, password });
      setContextUsername(username);
      setId(data.id);
    }
  }

  return (
    <div className="bg-blue-50 h-screen  flex items-center ">
      <div className="w-72 mx-auto mb-12">
        {loading ? (
          <img src="/loading.gif" alt="" />
        ) : (
          <>
            <div className="p-4">
              <img src="/logo.svg" alt="" />
            </div>
            <form onSubmit={handleSubmit}>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                type="text"
                placeholder="Username"
                className="block w-full rounded-xl p-2 mb-2 border "
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Password"
                className="block w-full rounded-xl p-2 mb-5 border"
              />
              <button className="bg-[#29ADB2] transition-all rounded-xl text-white block w-full  p-2 hover:bg-blue-400 active:bg-blue-800">
                {isLoginOrRegister === "register" ? " Register" : "Login"}
              </button>
              {isLoginOrRegister === "register" ? (
                <div className="text-center mt-2">
                  Already a member?{" "}
                  <button onClick={() => setIsLoginOrRegister("login")}>
                    Login here
                  </button>
                </div>
              ) : (
                <div className="text-center mt-2">
                  Don't have an account?{" "}
                  <button onClick={() => setIsLoginOrRegister("register")}>
                    Register
                  </button>
                </div>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default RegisterAndLoginForm;
