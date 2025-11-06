import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import { Auth } from "./pages/Auth";
import { Dashboard } from "./pages/Dashboard";
import { BookingSuccess } from "./pages/BookingSuccess";
import { Tutors } from "./pages/Tutors";
import { TutorProfile } from "./pages/TutorProfile";
import { Materials } from "./pages/Materials";
import { Availability } from "./pages/Availability";
import { AuthVerify } from "./pages/AuthVerify";
import { BecomeTutor } from "./pages/BecomeTutor";
import Academy from "./pages/Academy";
import CourseDetail from "./pages/CourseDetail";
import LessonPage from "./pages/LessonPage";
import StudyGroups from "./pages/StudyGroups";
import GroupChat from "./pages/GroupChat";
import ProfileSettings from "./pages/ProfileSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/verify" element={<AuthVerify />} />
            <Route path="/tutors" element={<Tutors />} />
            <Route path="/tutors/:id" element={<TutorProfile />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/availability" element={
              <ProtectedRoute>
                <Availability />
              </ProtectedRoute>
            } />
            <Route path="/booking-success" element={
              <ProtectedRoute>
                <BookingSuccess />
              </ProtectedRoute>
            } />
            <Route path="/become-tutor" element={
              <ProtectedRoute>
                <BecomeTutor />
              </ProtectedRoute>
            } />
            <Route path="/academy" element={<Academy />} />
            <Route path="/academy/:courseId" element={
              <ProtectedRoute>
                <CourseDetail />
              </ProtectedRoute>
            } />
            <Route path="/academy/lesson/:lessonId" element={
              <ProtectedRoute>
                <LessonPage />
              </ProtectedRoute>
            } />
            <Route path="/groups" element={
              <ProtectedRoute>
                <StudyGroups />
              </ProtectedRoute>
            } />
            <Route path="/groups/:groupId" element={
              <ProtectedRoute>
                <GroupChat />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
