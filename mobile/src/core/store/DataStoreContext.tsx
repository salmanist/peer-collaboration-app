import React, { createContext, useCallback, useContext, useState } from "react";
import type { Department } from "../departments/department";
import type {
  PublicResourceOffer,
  PublicResourceRequest,
  ResourceListing,
} from "../../features/resources/resources";
import type { LostAndFoundItem } from "../../features/lost_and_found/lostAndFound";
import type {
  AcademicCourse,
  SkillTopic,
  TutorProfile,
  TutoringSession,
} from "../../features/tutoring/tutoring";

interface DataStoreContextType {
  // Departments
  departments: Department[] | null;
  setDepartments: (data: Department[]) => void;
  invalidateDepartments: () => void;

  // Resource Sharing
  resourceListings: ResourceListing[] | null;
  setResourceListings: (data: ResourceListing[]) => void;
  publicResourceRequests: PublicResourceRequest[] | null;
  setPublicResourceRequests: (data: PublicResourceRequest[]) => void;
  myResourceOffers: PublicResourceOffer[] | null;
  setMyResourceOffers: (data: PublicResourceOffer[]) => void;
  myResourceListings: ResourceListing[] | null;
  setMyResourceListings: (data: ResourceListing[]) => void;
  invalidateResourceListings: () => void;

  // Lost & Found
  lostAndFoundItems: LostAndFoundItem[] | null;
  setLostAndFoundItems: (data: LostAndFoundItem[]) => void;
  myLostAndFoundItems: LostAndFoundItem[] | null;
  setMyLostAndFoundItems: (data: LostAndFoundItem[]) => void;
  invalidateLostAndFound: () => void;

  // Peer Tutoring
  tutors: TutorProfile[] | null;
  setTutors: (data: TutorProfile[]) => void;
  tutoringSessions: TutoringSession[] | null;
  setTutoringSessions: (data: TutoringSession[]) => void;
  academicCourses: AcademicCourse[] | null;
  setAcademicCourses: (data: AcademicCourse[]) => void;
  skillTopics: SkillTopic[] | null;
  setSkillTopics: (data: SkillTopic[]) => void;
  invalidateTutors: () => void;
  invalidateTutoringSessions: () => void;

  // Clear all cache
  invalidateAll: () => void;
}

const DataStoreContext = createContext<DataStoreContextType | undefined>(undefined);

export const DataStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Departments Cache
  const [departments, setDepartmentsState] = useState<Department[] | null>(null);

  // 2. Resource Sharing Cache
  const [resourceListings, setResourceListingsState] = useState<ResourceListing[] | null>(null);
  const [publicResourceRequests, setPublicResourceRequestsState] = useState<PublicResourceRequest[] | null>(null);
  const [myResourceOffers, setMyResourceOffersState] = useState<PublicResourceOffer[] | null>(null);
  const [myResourceListings, setMyResourceListingsState] = useState<ResourceListing[] | null>(null);

  // 3. Lost & Found Cache
  const [lostAndFoundItems, setLostAndFoundItemsState] = useState<LostAndFoundItem[] | null>(null);
  const [myLostAndFoundItems, setMyLostAndFoundItemsState] = useState<LostAndFoundItem[] | null>(null);

  // 4. Peer Tutoring Cache
  const [tutors, setTutorsState] = useState<TutorProfile[] | null>(null);
  const [tutoringSessions, setTutoringSessionsState] = useState<TutoringSession[] | null>(null);
  const [academicCourses, setAcademicCoursesState] = useState<AcademicCourse[] | null>(null);
  const [skillTopics, setSkillTopicsState] = useState<SkillTopic[] | null>(null);

  // Setters
  const setDepartments = useCallback((data: Department[]) => setDepartmentsState(data), []);
  const setResourceListings = useCallback((data: ResourceListing[]) => setResourceListingsState(data), []);
  const setPublicResourceRequests = useCallback((data: PublicResourceRequest[]) => setPublicResourceRequestsState(data), []);
  const setMyResourceOffers = useCallback((data: PublicResourceOffer[]) => setMyResourceOffersState(data), []);
  const setMyResourceListings = useCallback((data: ResourceListing[]) => setMyResourceListingsState(data), []);
  const setLostAndFoundItems = useCallback((data: LostAndFoundItem[]) => setLostAndFoundItemsState(data), []);
  const setMyLostAndFoundItems = useCallback((data: LostAndFoundItem[]) => setMyLostAndFoundItemsState(data), []);
  const setTutors = useCallback((data: TutorProfile[]) => setTutorsState(data), []);
  const setTutoringSessions = useCallback((data: TutoringSession[]) => setTutoringSessionsState(data), []);
  const setAcademicCourses = useCallback((data: AcademicCourse[]) => setAcademicCoursesState(data), []);
  const setSkillTopics = useCallback((data: SkillTopic[]) => setSkillTopicsState(data), []);

  // Invalidation / Eviction Helpers
  const invalidateDepartments = useCallback(() => setDepartmentsState(null), []);
  const invalidateResourceListings = useCallback(() => {
    setResourceListingsState(null);
    setPublicResourceRequestsState(null);
    setMyResourceListingsState(null);
  }, []);
  const invalidateLostAndFound = useCallback(() => {
    setLostAndFoundItemsState(null);
    setMyLostAndFoundItemsState(null);
  }, []);
  const invalidateTutors = useCallback(() => setTutorsState(null), []);
  const invalidateTutoringSessions = useCallback(() => setTutoringSessionsState(null), []);

  const invalidateAll = useCallback(() => {
    setDepartmentsState(null);
    setResourceListingsState(null);
    setPublicResourceRequestsState(null);
    setMyResourceOffersState(null);
    setMyResourceListingsState(null);
    setLostAndFoundItemsState(null);
    setMyLostAndFoundItemsState(null);
    setTutorsState(null);
    setTutoringSessionsState(null);
    setAcademicCoursesState(null);
    setSkillTopicsState(null);
  }, []);

  return (
    <DataStoreContext.Provider
      value={{
        departments,
        setDepartments,
        invalidateDepartments,

        resourceListings,
        setResourceListings,
        publicResourceRequests,
        setPublicResourceRequests,
        myResourceOffers,
        setMyResourceOffers,
        myResourceListings,
        setMyResourceListings,
        invalidateResourceListings,

        lostAndFoundItems,
        setLostAndFoundItems,
        myLostAndFoundItems,
        setMyLostAndFoundItems,
        invalidateLostAndFound,

        tutors,
        setTutors,
        tutoringSessions,
        setTutoringSessions,
        academicCourses,
        setAcademicCourses,
        skillTopics,
        setSkillTopics,
        invalidateTutors,
        invalidateTutoringSessions,

        invalidateAll,
      }}
    >
      {children}
    </DataStoreContext.Provider>
  );
};

export function useDataStore() {
  const context = useContext(DataStoreContext);
  if (!context) {
    throw new Error("useDataStore must be used within a DataStoreProvider");
  }
  return context;
}
