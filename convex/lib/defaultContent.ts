import type { PageKey } from "./pages";
import type { Section, Seo } from "./sections";

/**
 * Starter content for the six company pages, seeded once (pages.seedContent)
 * and then edited in the admin. Generic on purpose: no figures or claims
 * that SoilStack hasn't confirmed.
 */
type PageSeed = { seo: Seo; sections: Section[] };

const contactCta = (id: string): Section => ({
  id,
  hidden: false,
  type: "cta",
  title: { fr: "Parlons de votre exploitation", en: "Let’s talk about your farm" },
  text: {
    fr: "Dites-nous ce que vous cultivez et ce que vous voulez améliorer : notre équipe vous répond.",
    en: "Tell us what you grow and what you want to improve: our team will get back to you.",
  },
  button: { label: { fr: "Nous contacter", en: "Contact us" }, link: { kind: "page", page: "contact" } },
});

export const DEFAULT_PAGES: Record<PageKey, PageSeed> = {
  home: {
    seo: {
      title: { fr: "SoilStack — Agri-tech en RDC", en: "SoilStack — Agri-tech in the DRC" },
      description: {
        fr: "SoilStack aide les agriculteurs de la RDC à mieux connaître leurs sols et à augmenter leurs rendements grâce à des solutions simples et durables.",
        en: "SoilStack helps farmers in the DRC understand their soils and grow better yields with simple, sustainable solutions.",
      },
    },
    sections: [
      {
        id: "hero",
        hidden: false,
        type: "hero",
        eyebrow: { fr: "Agri-tech en RDC", en: "Agri-tech in the DRC" },
        title: {
          fr: "Des sols mieux connus pour des récoltes plus sûres",
          en: "Better-known soils for more reliable harvests",
        },
        subtitle: {
          fr: "SoilStack accompagne les agriculteurs et les coopératives avec l’analyse des sols, des conseils adaptés et des outils numériques pensés pour le terrain.",
          en: "SoilStack supports farmers and cooperatives with soil analysis, tailored advice and digital tools designed for the field.",
        },
        primaryCta: { label: { fr: "Nos solutions", en: "Our solutions" }, link: { kind: "page", page: "solutions" } },
        secondaryCta: { label: { fr: "Nous contacter", en: "Contact us" }, link: { kind: "page", page: "contact" } },
      },
      {
        id: "features",
        hidden: false,
        type: "featureGrid",
        items: [
          {
            icon: "Sprout",
            title: { fr: "Analyse des sols", en: "Soil analysis" },
            text: {
              fr: "Comprendre la fertilité de chaque parcelle avant de semer.",
              en: "Understand the fertility of each plot before planting.",
            },
          },
          {
            icon: "BarChart3",
            title: { fr: "Conseils sur mesure", en: "Tailored advice" },
            text: {
              fr: "Des recommandations claires sur les cultures et les apports.",
              en: "Clear recommendations on crops and inputs.",
            },
          },
          {
            icon: "Tractor",
            title: { fr: "Intrants de qualité", en: "Quality inputs" },
            text: {
              fr: "Les bons produits, au bon moment, pour chaque exploitation.",
              en: "The right products, at the right time, for each farm.",
            },
          },
          {
            icon: "Users",
            title: { fr: "Formation", en: "Training" },
            text: {
              fr: "Accompagner les agriculteurs et les coopératives sur le terrain.",
              en: "Supporting farmers and cooperatives in the field.",
            },
          },
        ],
      },
      {
        id: "how",
        hidden: false,
        type: "accordion",
        eyebrow: { fr: "Comment nous aidons", en: "How we help" },
        title: {
          fr: "Une démarche simple, de la parcelle à la récolte",
          en: "A simple approach, from plot to harvest",
        },
        images: [],
        items: [
          {
            title: { fr: "Diagnostic", en: "Assessment" },
            body: {
              fr: "Nous visitons l’exploitation, prélevons des échantillons de sol et écoutons vos objectifs.",
              en: "We visit the farm, take soil samples and listen to your goals.",
            },
          },
          {
            title: { fr: "Recommandations", en: "Recommendations" },
            body: {
              fr: "Vous recevez un plan clair : cultures adaptées, apports conseillés et calendrier.",
              en: "You receive a clear plan: suitable crops, recommended inputs and a calendar.",
            },
          },
          {
            title: { fr: "Suivi", en: "Follow-up" },
            body: {
              fr: "Nous suivons les résultats saison après saison pour ajuster le plan.",
              en: "We track results season after season to adjust the plan.",
            },
          },
        ],
      },
      contactCta("cta"),
    ],
  },

  about: {
    seo: {
      title: { fr: "À propos — SoilStack", en: "About — SoilStack" },
      description: {
        fr: "Découvrez SoilStack, notre mission et notre équipe au service de l’agriculture congolaise.",
        en: "Discover SoilStack, our mission and our team serving Congolese agriculture.",
      },
    },
    sections: [
      {
        id: "hero",
        hidden: false,
        type: "hero",
        eyebrow: { fr: "À propos", en: "About us" },
        title: { fr: "Au service de l’agriculture congolaise", en: "Serving Congolese agriculture" },
        subtitle: {
          fr: "SoilStack est une entreprise agri-tech née en RDC, avec une conviction : une agriculture plus productive commence par une meilleure connaissance des sols.",
          en: "SoilStack is an agri-tech company born in the DRC, with one conviction: more productive farming starts with knowing the soil better.",
        },
      },
      {
        id: "mission",
        hidden: false,
        type: "textImage",
        eyebrow: { fr: "Notre mission", en: "Our mission" },
        title: { fr: "Rendre l’expertise agronomique accessible", en: "Making agronomy expertise accessible" },
        body: {
          fr: "Nous mettons à la portée des agriculteurs des outils et des conseils autrefois réservés aux grandes exploitations.\n\nNotre équipe travaille au plus près du terrain, avec les coopératives et les partenaires locaux.",
          en: "We bring farmers tools and advice that used to be available only to large farms.\n\nOur team works close to the field, with cooperatives and local partners.",
        },
        imageSide: "right",
      },
      {
        id: "values",
        hidden: false,
        type: "featureGrid",
        eyebrow: { fr: "Nos valeurs", en: "Our values" },
        title: { fr: "Ce qui nous guide", en: "What guides us" },
        items: [
          {
            icon: "Leaf",
            title: { fr: "Durabilité", en: "Sustainability" },
            text: { fr: "Préserver les sols pour les générations futures.", en: "Protecting soils for future generations." },
          },
          {
            icon: "Users",
            title: { fr: "Proximité", en: "Closeness" },
            text: { fr: "Être présents sur le terrain, aux côtés des agriculteurs.", en: "Being in the field, alongside farmers." },
          },
          {
            icon: "ShieldCheck",
            title: { fr: "Fiabilité", en: "Reliability" },
            text: { fr: "Des conseils fondés sur des données vérifiées.", en: "Advice based on verified data." },
          },
        ],
      },
      contactCta("cta"),
    ],
  },

  solutions: {
    seo: {
      title: { fr: "Solutions — SoilStack", en: "Solutions — SoilStack" },
      description: {
        fr: "Analyse des sols, conseils agronomiques, intrants et formation : les solutions SoilStack pour les agriculteurs de la RDC.",
        en: "Soil analysis, agronomy advice, inputs and training: SoilStack’s solutions for farmers in the DRC.",
      },
    },
    sections: [
      {
        id: "hero",
        hidden: false,
        type: "hero",
        eyebrow: { fr: "Solutions", en: "Solutions" },
        title: { fr: "Des solutions pour chaque étape de la saison", en: "Solutions for every stage of the season" },
        subtitle: {
          fr: "Du diagnostic du sol à la récolte, nous proposons des services concrets, adaptés aux réalités des exploitations congolaises.",
          en: "From soil assessment to harvest, we offer practical services suited to the realities of Congolese farms.",
        },
      },
      {
        id: "list",
        hidden: false,
        type: "accordion",
        title: { fr: "Nos services", en: "Our services" },
        images: [],
        items: [
          {
            title: { fr: "Analyse des sols", en: "Soil analysis" },
            body: {
              fr: "Prélèvement, analyse et interprétation pour connaître le potentiel de chaque parcelle.",
              en: "Sampling, analysis and interpretation to know the potential of each plot.",
            },
          },
          {
            title: { fr: "Conseil agronomique", en: "Agronomy advice" },
            body: {
              fr: "Un plan de culture et de fertilisation adapté à vos objectifs et à votre budget.",
              en: "A cropping and fertilisation plan suited to your goals and budget.",
            },
          },
          {
            title: { fr: "Intrants", en: "Inputs" },
            body: {
              fr: "Semences, engrais et équipements sélectionnés pour leur qualité.",
              en: "Seeds, fertilisers and equipment selected for their quality.",
            },
          },
          {
            title: { fr: "Formation et suivi", en: "Training and follow-up" },
            body: {
              fr: "Des sessions pratiques et un suivi régulier pour les agriculteurs et les coopératives.",
              en: "Hands-on sessions and regular follow-up for farmers and cooperatives.",
            },
          },
        ],
      },
      contactCta("cta"),
    ],
  },

  innovation: {
    seo: {
      title: { fr: "Innovation — SoilStack", en: "Innovation — SoilStack" },
      description: {
        fr: "Comment SoilStack utilise les données et le numérique pour une agriculture plus précise en RDC.",
        en: "How SoilStack uses data and digital tools for more precise farming in the DRC.",
      },
    },
    sections: [
      {
        id: "hero",
        hidden: false,
        type: "hero",
        eyebrow: { fr: "Innovation", en: "Innovation" },
        title: { fr: "La technologie au service du terrain", en: "Technology that serves the field" },
        subtitle: {
          fr: "Nous développons des outils simples, qui fonctionnent même avec une connexion limitée, pour transformer les données en décisions.",
          en: "We build simple tools that work even with limited connectivity, turning data into decisions.",
        },
      },
      {
        id: "pillars",
        hidden: false,
        type: "bento",
        eyebrow: { fr: "Nos axes", en: "Our focus" },
        title: { fr: "Construire une agriculture plus précise", en: "Building more precise farming" },
        cards: [
          { title: { fr: "Données des sols", en: "Soil data" }, tone: "dark" },
          { title: { fr: "Cartographie des parcelles", en: "Plot mapping" }, tone: "light" },
          { title: { fr: "Outils mobiles", en: "Mobile tools" }, tone: "dark" },
        ],
      },
      contactCta("cta"),
    ],
  },

  projects: {
    seo: {
      title: { fr: "Projets — SoilStack", en: "Projects — SoilStack" },
      description: {
        fr: "Les projets menés par SoilStack avec les agriculteurs et les partenaires en RDC.",
        en: "Projects led by SoilStack with farmers and partners in the DRC.",
      },
    },
    sections: [
      {
        id: "hero",
        hidden: false,
        type: "hero",
        eyebrow: { fr: "Projets", en: "Projects" },
        title: { fr: "Nos projets sur le terrain", en: "Our projects in the field" },
        subtitle: {
          fr: "Découvrez les initiatives que nous menons avec les agriculteurs, les coopératives et nos partenaires.",
          en: "Discover the initiatives we run with farmers, cooperatives and our partners.",
        },
      },
      contactCta("cta"),
    ],
  },

  contact: {
    seo: {
      title: { fr: "Contact — SoilStack", en: "Contact — SoilStack" },
      description: {
        fr: "Contactez l’équipe SoilStack par téléphone, WhatsApp ou e-mail.",
        en: "Contact the SoilStack team by phone, WhatsApp or email.",
      },
    },
    sections: [
      {
        id: "hero",
        hidden: false,
        type: "hero",
        eyebrow: { fr: "Contact", en: "Contact" },
        title: { fr: "Parlons de votre projet", en: "Let’s talk about your project" },
        subtitle: {
          fr: "Une question sur nos solutions ou nos produits ? Notre équipe vous répond.",
          en: "A question about our solutions or products? Our team will answer.",
        },
      },
      {
        id: "contact",
        hidden: false,
        type: "contactInfo",
        title: { fr: "Nos coordonnées", en: "Get in touch" },
      },
    ],
  },
};
