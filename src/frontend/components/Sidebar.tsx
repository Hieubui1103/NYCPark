

const Sidebar = () => (
  <aside className="w-1/6 bg-white border-r p-4 overflow-y-auto flex flex-col min-w-0">
    <div className="mb-6 p-4 bg-gray-50 rounded shadow">
      <div className="font-semibold mb-3 text-base break-words">This interactive map provides detailed information on New York City's public open spaces, allowing you to explore various aspects of the city's parks and land use.</div>
      <h2 className="font-bold mb-3 mt-2 text-lg">Explore Park Details:</h2>
      <ul className="text-sm list-disc ml-5 mb-4 space-y-1">
        <li><b>GISPROPNUM:</b> Unique identification number for each public open space.</li>
        <li><b>Public Open Space Name:</b> Name of the public open space.</li>
        <li><b>Open Space Acres:</b> Size of the open space resource in acres.</li>
        <li><b>Active Percent:</b> Percentage dedicated to active recreational amenities, such as ball fields, playgrounds.</li>
        <li><b>Passive Percent:</b> Percentage dedicated to passive recreational amenities, such as benches and walking paths.</li>
        <li><b>Location:</b> Description of the location of a property with respect to the street system and physical features such as water bodies.</li>
        <li><b>ZIPCODE(S):</b> Zipcode in which the property is located.</li>
      </ul>
      <div className="text-xs mt-2">
        For general zoning questions: read the <a href="#" className="underline text-blue-700">Zoning Help Desk FAQ</a>.<br />
        If your question isn't answered there, call <b>212-720-3291</b> during business hours (9:30AM-5:30PM, Monday-Friday; closed on legal holidays).
      </div>
    </div>
  </aside>
);

export default Sidebar;
