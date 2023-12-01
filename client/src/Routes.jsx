import { useContext } from "react";
import RegisterAndLoginForm from "./RegisterAndLoginForm";
import { UserContext } from "./UserContext";
import Chat from "./Chat";

const Routes = () => {
  const { username, loading } = useContext(UserContext);
  if (username && !loading) {
    return <Chat />;
  }
  return <RegisterAndLoginForm />;
};

export default Routes;
