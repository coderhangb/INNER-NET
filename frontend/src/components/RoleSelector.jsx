import studentIcon from "../assets/studentIcon.png";
import parentsIcon from "../assets/parentsIcon.png";
import teacherIcon from "../assets/teacherIcon.png";

const roles = [
  {
    value: "student",
    label: "Student",
    icon: studentIcon,
  },
  {
    value: "parents",
    label: "Parents",
    icon: parentsIcon,
  },
  {
    value: "teacher",
    label: "Teacher",
    icon: teacherIcon,
  },
];

function RoleSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      {roles.map((role) => {
        const isActive = value === role.value;

        return (
          <button
            key={role.value}
            type="button"
            onClick={() => onChange(role.value)}
            className={`
              flex
              h-24
              flex-col
              items-center
              justify-center
              rounded-[22px]
              transition-all
              ${
                isActive
                  ? `
                    bg-linear-to-br
                    from-[#0284C7]
                    to-[#0EA5E9]
                    text-white
                    shadow-[0_4px_0_#0369A1]
                  `
                  : `
                    bg-[#F1F1F1]
                    text-[#222222]
                    hover:bg-[#E8E8E8]
                  `
              }
            `}
          >
            <img
              src={role.icon}
              alt={role.label}
              className="
                mb-1
                h-12
                w-12
                object-contain
              "
            />

            <span className="text-sm font-semibold">{role.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default RoleSelector;
