import { NextResponse } from "next/server"
import { client } from "@/sanity/lib/client"
import { urlForImage } from "@/sanity/lib/image"
import { groq } from "next-sanity"
// @ts-ignore

import { validateCartItems } from "use-shopping-cart/utilities"

import { SanityProduct } from "@/config/inventory"
import { stripe } from "@/lib/stripe"

export async function POST(request: Request) {
  const cartDetails = await request.json()
  const inventoryElements = await client.fetch<SanityProduct[]>(
    groq`*[_type == "product"] {
      _id,
      _createdAt,
      "id": _id,
      sku,
      images,
      price,
      name,
      currency,
      description,
      sizes,
      categories,
      color,
      "slug": slug.current
    }`
  )

  const idk = inventoryElements.map((inventoryElement) => ({
    ...inventoryElement,
    images: inventoryElement.images.map((image) => urlForImage(image).url()),
  }))
  const lineItems = validateCartItems(idk, cartDetails)
  const origin = request.headers.get("origin")

  console.log("Data from SANITY to check", idk, lineItems)

  const session = await stripe.checkout.sessions.create({
    submit_type: "pay",
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    shipping_address_collection: {
      allowed_countries: ["PL"],
    },
    shipping_options: [
      {
        shipping_rate: "shr_1NlYl2LQXS9Js9Oao4XDiABS",
      },
    ],
    billing_address_collection: "auto",
    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart`,
  })
  return NextResponse.json(session)
}
