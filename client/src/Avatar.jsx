/* eslint-disable react/prop-types */
// eslint-disable-next-line no-unused-vars
const Avatar = ({ userId, username, online }) => {
  const colors = [
    "bg-teal-200",
    "bg-red-200",
    "bg-green-200",
    "bg-purple-200",
    "bg-blue-200",
    "bg-yellow-200",
  ];

  const color = colors[Math.floor(Math.random() * 6)];

  return (
    <div
      className={
        "flex relative items-center w-8 h-8 rounded-full bg-purple-200"
      }
    >
      <div className="text-center w-full opacity-70">
        {/* {username ? username[0] : "N/A"} */}
        {username[0]}
      </div>

      {online && (
        <div
          className="absolute w-3 h-3 
        bg-green-400 rounded-full
        border border-white
       -bottom-1 -right-1"
        ></div>
      )}

      {!online && (
        <div
          className="absolute w-3 h-3 
        bg-red-400 rounded-full
        border border-white
       -bottom-1 -right-1"
        ></div>
      )}
    </div>
  );
};

export default Avatar;
