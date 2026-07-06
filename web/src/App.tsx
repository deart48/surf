import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './app/AppLayout';
import { RequireAuth } from './app/RequireAuth';
import { LoginPage } from './features/auth/LoginPage';
import { OtpPage } from './features/auth/OtpPage';
import { BookingDetailsPage } from './features/booking/BookingDetailsPage';
import { BookingFormPage } from './features/booking/BookingFormPage';
import { BookingSuccessPage } from './features/booking/BookingSuccessPage';
import { MyBookingsPage } from './features/booking/MyBookingsPage';
import { ClassesListPage } from './features/catalog/ClassesListPage';
import { SlotCardPage } from './features/catalog/SlotCardPage';
import { ProfilePage } from './features/profile/ProfilePage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/verify" element={<OtpPage />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/classes" element={<ClassesListPage />} />
        <Route path="/classes/:slotId" element={<SlotCardPage />} />
        <Route path="/classes/:slotId/book" element={<BookingFormPage />} />
        <Route path="/bookings/:bookingId/success" element={<BookingSuccessPage />} />
        <Route path="/bookings" element={<MyBookingsPage />} />
        <Route path="/bookings/:bookingId" element={<BookingDetailsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="/" element={<Navigate to="/classes" replace />} />
      <Route path="*" element={<Navigate to="/classes" replace />} />
    </Routes>
  );
}
