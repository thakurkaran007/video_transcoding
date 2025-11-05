import AppBar from "@/components/button/Appbar";

const HomeLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="min-w-screen min-h-screen bg-[#ebe6e6] overflow-hidden">
            <AppBar />
            {children}
        </div>
    );
};

export default HomeLayout;