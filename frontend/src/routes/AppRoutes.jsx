import { Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import EventsList from "../pages/EventsList";
import EventDetails from "../pages/EventDetails";
import MyRegistrations from "../pages/MyRegistrations";
import MyTickets from "../pages/MyTickets";
import VerifyTicket from "../pages/VerifyTicket";
import VenueList from "../pages/VenueList";
import BookVenue from "../pages/BookVenue";
import OrganizerEventManagement from "../pages/OrganizerEventManagement";
import AdminDashboard from "../pages/AdminDashboard";
import AdminVenueManagement from "../pages/AdminVenueManagement";
import Unauthorized from "../pages/Unathorized";
import NotFound from "../pages/NotFound";
import ProtectedRoute from "../components/ProtectedRoute";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="events" element={<EventsList />} />
        <Route path="events/:id" element={<EventDetails />} />
        <Route path="venues" element={<VenueList />} />
        <Route path="unauthorized" element={<Unauthorized />} />

        <Route element={<ProtectedRoute allowedRoles={["ATTENDEE", "ORGANIZER", "ADMIN"]} />}>
          <Route path="my-registrations" element={<MyRegistrations />} />
          <Route path="my-tickets" element={<MyTickets />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["ORGANIZER"]} />}>
          <Route path="book-venue/:venueId" element={<BookVenue />} />
          <Route path="organizer/events" element={<OrganizerEventManagement />} />
          <Route path="verify-ticket" element={<VerifyTicket />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
          <Route path="admin/dashboard" element={<AdminDashboard />} />
          <Route path="admin/venues" element={<AdminVenueManagement />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;