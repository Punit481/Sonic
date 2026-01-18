interface FileProps {
  icon: string;
  title: string;
  isFocussed: boolean;
  onClick?: () => void;
}

function SideBarFile({ icon, title, isFocussed, onClick }: FileProps) {
  return (
    <>
      <div
        onClick={onClick}
        className={`flex gap-3 ${
          isFocussed ? "bg-primary-300" : ""
        } px-4 py-2 rounded-sm cursor-pointer hover:bg-primary-300  transition-colors duration-200`}
      >
        <img className="w-5 h-5" src={icon} />
        <h5
          className={`hidden 3xl:block ${
            isFocussed ? "font-semibold" : "text-black-700"
          }`}
        >
          {title}
        </h5>
      </div>
    </>
  );
}

export default SideBarFile;
