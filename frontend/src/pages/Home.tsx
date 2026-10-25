import Footer from "../components/layout/Footer";
import Hero from "../components/marketing/Hero";
import How from "../components/marketing/How";
import Navbar from "../components/layout/Navbar";
import Plan from "../components/marketing/Plan";

function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <How />
      <Plan />
      <Footer />
    </>
  );
}

export default Home;
