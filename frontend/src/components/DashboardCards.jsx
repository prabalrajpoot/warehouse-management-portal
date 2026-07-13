function DashboardCards({

title,
value

}){

return(

<div className="bg-white shadow rounded p-6 w-60">

<h2 className="text-gray-500">

{title}

</h2>

<h1 className="text-4xl font-bold">

{value}

</h1>

</div>

)

}

export default DashboardCards