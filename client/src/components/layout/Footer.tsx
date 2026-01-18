import instagram from "../../assets/icons/instagram.svg";
import x from "../../assets/icons/x.svg";

function Footer() {
  return (
    <>
      <div className="main-container flex justify-between  py-4 mb-0 mt-8">
        <p className="">&copy; 2025 sonic. Released under the MIT License.</p>
        <div className="flex gap-4">
          <img
            className="w-5 cursor-pointer"
            src={instagram}
            alt="instagram icon"
          />
          <img className="w-5 cursor-pointer" src={x} alt="x(twitter) icon" />
        </div>
      </div>
    </>
  );
}

export default Footer;
