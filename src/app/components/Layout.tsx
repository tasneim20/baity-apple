import { Outlet, useLocation } from "react-router";
import { AppProvider } from "../context/AppContext";
import Chatbot from "./Chatbot";
import BackButton from "./BackButton";
import Footer from "./Footer";

function LayoutInner() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isAuth = location.pathname === "/auth";
  const isPropertyDetails = location.pathname.startsWith("/property/");

  return (
    <>
      <Outlet />
      {isHome && <Footer />}
      {!isAuth && <Chatbot />}
      <BackButton />
    </>
  );
}

export default function Layout() {
  return (
    <AppProvider>
      <LayoutInner />
    </AppProvider>
  );
}