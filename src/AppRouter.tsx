import FieldApp from "./FieldApp";
import AdminRoute from "./AdminRoute";

export default function AppRouter(){
  return window.location.pathname.startsWith("/admin")?<AdminRoute/>:<FieldApp/>;
}
