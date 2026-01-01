import DashboardLayout from "./dashboard/layout";

export default function Home() {
  return (
    <div> 
      <DashboardLayout>
        <div className="grid grid-cols-12 gap-6">
          {/* Services */}
          <div className="col-span-8 bg-white rounded-xl p-4">
            Service Grid Here
          </div>

          {/* Cart */}
          <div className="col-span-4 bg-white rounded-xl p-4">
            Cart Panel Here
          </div>
        </div>
      </DashboardLayout>
    </div>
    
  );
}
