import { getTranslations } from "next-intl/server"
import { Star, Quote } from "lucide-react"
import { Card } from "@/components/ui"
import { TestimonialScroll } from "./testimonial-scroll"

const testimonials = [
  {
    name: "Ramachandra Shetty",
    village: "Bantwal",
    rating: 5,
    text: "The carbon fiber pole would have cost ₹60,000 to buy. Got it for ₹149/day on Payaswini O Bele. Areca harvesting became so easy and safe.",
  },
  {
    name: "Parvati Nayak",
    village: "Puttur",
    rating: 5,
    text: "Earlier my husband had to climb trees. Now with this pole, we can harvest standing on the ground. Much safer and faster.",
  },
  {
    name: "Gopala Poojari",
    village: "Belthangady",
    rating: 4,
    text: "Delivery was on time. Tool was in great condition. Deposit was refunded immediately after return. Very satisfied with the service.",
  },
  {
    name: "Savita Kumari",
    village: "Mangaluru",
    rating: 5,
    text: "As a woman farmer, this service has been a blessing. The sprayer is easy to operate and the rental process was smooth.",
  },
]

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
}

const avatarColors = [
  "bg-bele-green",
  "bg-bele-soil",
  "bg-bele-gold",
  "bg-payaswini-blue",
]

export default async function Testimonials() {
  const t = await getTranslations("testimonials")

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container">
        <div className="ent-fade-in-up mb-10 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
              {t("title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("headline")}
            </p>
          </div>
        </div>

        <TestimonialScroll>
          {testimonials.map((item, i) => (
            <div
              key={i}
              className={`${i === 0 ? "ent-fade-in-up" : `ent-fade-in-up-d${i}`} w-[320px] shrink-0 snap-start md:w-[360px]`}
            >
              <Card className="relative h-full rounded-2xl p-6">
                <Quote className="absolute right-4 top-4 h-8 w-8 text-bele-gold/20" />
                <div className="mb-3 flex gap-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star
                      key={j}
                      className={`h-4 w-4 ${
                        j < item.rating
                          ? "fill-bele-gold text-bele-gold"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{item.text}&rdquo;
                </p>
                <div className="flex items-center gap-3 border-t border-border pt-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColors[i % avatarColors.length]}`}
                  >
                    {getInitials(item.name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.village}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </TestimonialScroll>
      </div>
    </section>
  )
}
