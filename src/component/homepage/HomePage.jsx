import React from "react";
import HeroSection from "./HeroSection";
import KnowledgeBase from "./KnowledgeBase";
import Footer from "./Footer";


const Index = () => {
  return (
    <div className="index-root min-h-screen bg-background">
      <main>
        <HeroSection />
        
        <KnowledgeBase />
      </main>
    </div>
  );
};

export default Index;