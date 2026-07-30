import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    success: true,
    data: [
      { id: "CLIMBING_POLES", name: "Climbing Poles", slug: "climbing-poles" },
      { id: "TILLERS", name: "Tillers", slug: "tillers" },
      { id: "NETS_COVERS", name: "Nets & Covers", slug: "nets-covers" },
      { id: "TRANSPLANTERS", name: "Transplanters", slug: "transplanters" },
      { id: "SPRAYERS", name: "Sprayers", slug: "sprayers" },
      { id: "PRUNERS_CUTTERS", name: "Pruners & Cutters", slug: "pruners-cutters" },
      { id: "WATER_PUMPS", name: "Water Pumps", slug: "water-pumps" },
      { id: "HARVESTING_TOOLS", name: "Harvesting Tools", slug: "harvesting-tools" },
    ],
  })
}
