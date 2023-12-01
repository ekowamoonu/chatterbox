/* eslint-disable react/prop-types */
import axios from "axios";
import { createContext, useEffect, useState } from "react";

export const UserContext = createContext({});

export const UserContextProvider = ({ children }) => {
  const [username, setContextUsername] = useState(null);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState(null);

  useEffect(() => {
    axios
      .get("/profile")
      .then((response) => {
        setLoading(false);
        setId(response.data.userId);
        setContextUsername(response.data.username);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <UserContext.Provider
      value={{ username, setContextUsername, id, setId, loading }}
    >
      {children}
    </UserContext.Provider>
  );
};
