export function Logo({ className = "" }: { className?: string }) {
  console.log("Logo component is rendering!"); 
  return (
    <div 
      style={{
        width: "32px", 
        height: "32px", 
        backgroundColor: "green",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        border: "2px solid red"
      }}
    >
      LOGO
    </div>
  );
}