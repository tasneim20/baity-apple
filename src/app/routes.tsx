import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Properties from "./pages/Properties";
import Governorate from "./pages/Governorate";
import PropertyDetails from "./pages/PropertyDetails";
import AddProperty from "./pages/AddProperty";
import EditProperty from "./pages/EditProperty";
import Dashboard from "./pages/Dashboard";
import MyProperties from "./pages/MyProperties";
import Favorites from "./pages/Favorites";
import Messages from "./pages/Messages";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProperties from "./pages/AdminProperties";
import AdminLogin from "./pages/AdminLogin";
import AdminReports from "./pages/AdminReports";
import AdminMessages from "./pages/AdminMessages";
import AdminLogs from "./pages/AdminLogs";
import AdminTransactions from "./pages/AdminTransactions";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import AdminCSV from "./pages/AdminCSV";
import AdminAddedProperties from "./pages/AdminAddedProperties";
import AdminUsers from "./pages/AdminUsers";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "properties", Component: Properties },
      { path: "governorate/:id", Component: Governorate },
      { path: "property/:id", Component: PropertyDetails },
      { path: "add-property", Component: AddProperty },
      { path: "edit-property/:id", Component: EditProperty },
      { path: "dashboard", Component: Dashboard },
      { path: "my-properties", Component: MyProperties },
      { path: "favorites", Component: Favorites },
      { path: "messages", Component: Messages },
      { path: "notifications", Component: Notifications },
      { path: "auth", Component: Auth },
      { path: "reset-password", Component: ResetPassword },
      { path: "settings", Component: Settings },
      { path: "admin", Component: AdminDashboard },
      { path: "admin/login", Component: AdminLogin },
      { path: "admin/properties", Component: AdminProperties },
      { path: "admin/reports", Component: AdminReports },
      { path: "admin/messages", Component: AdminMessages },
      { path: "admin/logs", Component: AdminLogs },
      { path: "admin/transactions", Component: AdminTransactions },
      { path: "admin/csv", Component: AdminCSV },
      { path: "admin/added-properties", Component: AdminAddedProperties },
      { path: "admin/users", Component: AdminUsers },
      { path: "*", Component: NotFound },
    ],
  },
]);