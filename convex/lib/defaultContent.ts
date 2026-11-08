import type { PageKey } from "./pages";
import type { Section, Seo } from "./sections";

/**
 * Starter content for the six company pages, seeded once (pages.seedContent)
 * and then edited in the admin. It describes what SoilStack actually offers
 * (software, AI crop advice, drones, supplies, agronomists) - no figures,
 * client numbers or claims that SoilStack hasn't confirmed.
 */
type PageSeed = { seo: Seo; sections: Section[] };

const contactCta = (id: string): Section => ({
  id,
  hidden: false,
  type: "cta",
  title: { fr: "Un projet, une question ?", en: "Have a project or a question?" },
  text: {
    fr: "Parlez-nous de votre exploitation ou de votre organisation, et nous reviendrons vers vous.",
    en: "Tell us about your farm or organization and we’ll get back to you.",
  },
  button: { label: { fr: "Nous contacter", en: "Contact us" }, link: { kind: "page", page: "contact" } },
});

export const DEFAULT_PAGES: Record<PageKey, PageSeed> = {
  home: {
    seo: {
      title: { fr: "SoilStack — Technologie agricole en RDC", en: "SoilStack — Agricultural technology in the DRC" },
      description: {
        fr: "SoilStack conçoit des logiciels, des outils d’IA et des solutions agricoles pour les exploitations de la RDC, de la petite parcelle familiale à la grande ferme commerciale.",
        en: "SoilStack builds software, AI tools and farming solutions for farmers across the DRC, from small family plots to large commercial farms.",
      },
    },
    sections: [
      {
        id: "hero",
        hidden: false,
        type: "hero",
        eyebrow: { fr: "Agri-tech en RDC", en: "Agri-tech in the DRC" },
        title: {
          fr: "La technologie qui fait grandir les exploitations de la RDC",
          en: "Technology that helps DRC farms grow",
        },
        subtitle: {
          fr: "SoilStack conçoit des logiciels, des outils d’intelligence artificielle et des solutions agricoles pour les agriculteurs de toute la RDC, de la petite parcelle familiale à la grande exploitation commerciale.",
          en: "SoilStack builds software, AI tools and farming solutions for farmers across the DRC, from small family plots to large commercial farms.",
        },
        primaryCta: {
          label: { fr: "Découvrir nos solutions", en: "Explore our solutions" },
          link: { kind: "page", page: "solutions" },
        },
        secondaryCta: { label: { fr: "Parlons-en", en: "Talk to us" }, link: { kind: "page", page: "contact" } },
      },
      {
        id: "features",
        hidden: false,
        type: "featureGrid",
        items: [
          {
            icon: "BarChart3",
            title: { fr: "Logiciel de gestion agricole", en: "Farm management software" },
            text: {
              fr: "Suivez vos parcelles, vos travaux et vos dépenses au même endroit.",
              en: "Keep track of your plots, work and costs in one place.",
            },
          },
          {
            icon: "Cpu",
            title: { fr: "Conseils IA pour vos cultures", en: "AI crop advice" },
            text: {
              fr: "Repérez tôt les problèmes sur vos cultures et sachez quoi faire.",
              en: "Spots crop problems early and recommends what to do.",
            },
          },
          {
            icon: "Droplets",
            title: { fr: "Services de drones", en: "Drone services" },
            text: {
              fr: "Surveillance aérienne et pulvérisation de vos champs.",
              en: "Aerial monitoring and spraying for your fields.",
            },
          },
          {
            icon: "Sprout",
            title: { fr: "Intrants agricoles", en: "Agricultural supplies" },
            text: {
              fr: "Engrais, semences et outils pour les petites comme les grandes exploitations.",
              en: "Fertilizer, seeds and tools for small and large farms.",
            },
          },
        ],
      },
      {
        id: "how",
        hidden: false,
        type: "accordion",
        eyebrow: { fr: "Comment nous aidons", en: "How we help" },
        title: { fr: "Des outils, des produits et des personnes", en: "Tools, products and people" },
        images: [],
        items: [
          {
            title: { fr: "Vous nous parlez de votre exploitation", en: "You tell us about your farm" },
            body: {
              fr: "Ce que vous cultivez, la taille de vos parcelles, ce qui vous freine.",
              en: "What you grow, how big your plots are, what’s holding you back.",
            },
          },
          {
            title: { fr: "Nous vous proposons les bons outils", en: "We suggest the right tools" },
            body: {
              fr: "Logiciel, conseils IA, drones ou intrants : seulement ce qui vous sert vraiment.",
              en: "Software, AI advice, drones or supplies: only what is actually useful to you.",
            },
          },
          {
            title: { fr: "Un agronome reste à vos côtés", en: "An agronomist stays with you" },
            body: {
              fr: "Quand vous avez besoin d’une vraie personne, nos agronomes vous répondent et suivent vos résultats.",
              en: "When you need a real person, our agronomists answer and follow your results.",
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
        fr: "Une équipe de la RDC qui conçoit des outils et fournit des produits pour une agriculture plus productive et plus rentable.",
        en: "A team from the DRC building tools and supplying products for more productive, more profitable farming.",
      },
    },
    sections: [
      {
        id: "hero",
        hidden: false,
        type: "hero",
        eyebrow: { fr: "À propos", en: "About us" },
        title: {
          fr: "Une équipe de la RDC, au service des agriculteurs",
          en: "A team from the DRC, working for farmers",
        },
        subtitle: {
          fr: "Nous sommes une équipe de la RDC, et nous construisons des solutions pour les agriculteurs d’ici.",
          en: "We are a team from the DRC, building solutions for the farmers who work here.",
        },
      },
      {
        id: "mission",
        hidden: false,
        type: "textImage",
        eyebrow: { fr: "Notre mission", en: "Our mission" },
        title: { fr: "Rendre l’expertise agronomique accessible", en: "Make agronomic expertise accessible" },
        body: {
          fr: "Les agriculteurs de la RDC font face aux maladies des cultures, à une météo imprévisible, à des intrants coûteux et à un accès limité aux conseils d’experts.\n\nNous concevons les outils et fournissons les produits qui rendent l’agriculture plus productive et plus rentable, pour les petites exploitations familiales comme pour les grandes fermes commerciales.",
          en: "Farmers in the DRC face crop disease, unpredictable weather, costly inputs and little access to expert advice.\n\nWe build the tools and supply the products that make farming more productive and profitable, for small family farms and large commercial ones alike.",
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
            icon: "ShieldCheck",
            title: { fr: "Des conseils vérifiés par des agronomes", en: "Advice checked by agronomists" },
            text: {
              fr: "Ce que recommandent nos outils est relu par des agronomes avant d’arriver jusqu’à vous.",
              en: "What our tools recommend is reviewed by agronomists before it reaches you.",
            },
          },
          {
            icon: "Users",
            title: { fr: "Construit avec les agriculteurs, sur le terrain", en: "Built with farmers, on the ground" },
            text: {
              fr: "Nous testons nos solutions dans de vraies exploitations, avec celles et ceux qui les utilisent.",
              en: "We test our solutions on real farms, with the people who use them.",
            },
          },
          {
            icon: "Leaf",
            title: {
              fr: "Honnêtes sur ce que nos outils peuvent faire, ou pas",
              en: "Honest about what our tools can and can’t do",
            },
            text: {
              fr: "L’IA ne remplace pas un agronome. Nous vous disons clairement où s’arrêtent nos outils.",
              en: "AI doesn’t replace an agronomist. We tell you clearly where our tools stop.",
            },
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
        fr: "Logiciel de gestion agricole, conseils IA, drones, intrants et agronomes : les solutions SoilStack pour les exploitations de la RDC.",
        en: "Farm management software, AI crop advice, drones, supplies and agronomists: SoilStack’s solutions for farms in the DRC.",
      },
    },
    sections: [
      {
        id: "hero",
        hidden: false,
        type: "hero",
        eyebrow: { fr: "Solutions", en: "Solutions" },
        title: { fr: "Des solutions pour chaque exploitation", en: "Solutions for every farm" },
        subtitle: {
          fr: "Logiciel, intelligence artificielle, drones, intrants et agronomes : choisissez ce qui convient à votre exploitation, petite ou grande.",
          en: "Software, AI, drones, supplies and agronomists: pick what fits your farm, small or large.",
        },
      },
      {
        id: "list",
        hidden: false,
        type: "accordion",
        title: { fr: "Nos solutions", en: "Our solutions" },
        images: [],
        items: [
          {
            title: { fr: "Logiciel de gestion agricole", en: "Farm management software" },
            body: {
              fr: "Planifiez vos saisons, suivez vos parcelles, vos travaux et vos dépenses, et gardez l’historique de votre exploitation.",
              en: "Plan your seasons, track your plots, work and costs, and keep a record of your farm over time.",
            },
          },
          {
            title: { fr: "Conseils IA pour vos cultures", en: "AI crop advice" },
            body: {
              fr: "Notre outil d’IA repère tôt les problèmes sur vos cultures, comme les maladies ou les carences, et vous recommande quoi faire.",
              en: "Our AI tool spots crop problems early, such as disease or nutrient deficiencies, and recommends what to do.",
            },
          },
          {
            title: { fr: "Services de drones", en: "Drone services" },
            body: {
              fr: "Surveillance aérienne pour voir l’état de vos champs d’un coup d’œil, et pulvérisation précise là où il le faut.",
              en: "Aerial monitoring to see the state of your fields at a glance, and precise spraying where it’s needed.",
            },
          },
          {
            title: { fr: "Intrants agricoles", en: "Agricultural supplies" },
            body: {
              fr: "Engrais, semences et outils, pour les petites parcelles comme pour les grandes exploitations.",
              en: "Fertilizer, seeds and tools, for small plots and large farms alike.",
            },
          },
          {
            title: { fr: "Accompagnement par des experts", en: "Expert support" },
            body: {
              fr: "Quand vous avez besoin de parler à quelqu’un, de vrais agronomes vous répondent et vous conseillent.",
              en: "When you need a person, real agronomists are there to answer and advise you.",
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
        fr: "Comment SoilStack utilise l’IA, les drones et les données pour une agriculture plus sûre en RDC.",
        en: "How SoilStack uses AI, drones and data to take the guesswork out of farming in the DRC.",
      },
    },
    sections: [
      {
        id: "hero",
        hidden: false,
        type: "hero",
        eyebrow: { fr: "Innovation", en: "Innovation" },
        title: { fr: "Cultiver avec moins d’incertitude", en: "Farming with less guesswork" },
        subtitle: {
          fr: "Nous utilisons l’IA, les drones et les données pour aider les agriculteurs à prendre de meilleures décisions, sans avoir à deviner.",
          en: "We use AI, drones and data to take the guesswork out of farming.",
        },
      },
      {
        id: "pillars",
        hidden: false,
        type: "bento",
        eyebrow: { fr: "Nos axes", en: "Our focus" },
        title: { fr: "Pensé et testé en RDC", en: "Built and tested in the DRC" },
        intro: {
          fr: "Nos outils sont conçus et testés dans des exploitations congolaises, avec des agronomes locaux.",
          en: "Our tools are built and tested on DRC farms, with local agronomists.",
        },
        cards: [
          { title: { fr: "Intelligence artificielle", en: "Artificial intelligence" }, tone: "dark" },
          { title: { fr: "Drones", en: "Drones" }, tone: "light" },
          { title: { fr: "Données agricoles", en: "Farm data" }, tone: "dark" },
        ],
      },
      contactCta("cta"),
    ],
  },

  projects: {
    seo: {
      title: { fr: "Projets — SoilStack", en: "Projects — SoilStack" },
      description: {
        fr: "Ce que construit SoilStack : notre plateforme, les drones, les intrants et une API pour les partenaires.",
        en: "What SoilStack is building: our platform, drones, supplies and an API for partners.",
      },
    },
    sections: [
      {
        id: "hero",
        hidden: false,
        type: "hero",
        eyebrow: { fr: "Projets", en: "Projects" },
        title: { fr: "Ce que nous construisons", en: "What we’re building" },
        subtitle: {
          fr: "Où en sont nos projets aujourd’hui, et ce qui arrive ensuite.",
          en: "Where our projects stand today, and what comes next.",
        },
      },
      {
        id: "list",
        hidden: false,
        type: "featureGrid",
        items: [
          {
            icon: "Cpu",
            title: { fr: "Plateforme SoilStack", en: "SoilStack Platform" },
            text: {
              fr: "En développement. Notre logiciel de gestion agricole et nos conseils IA, réunis dans un même outil.",
              en: "In development. Our farm management software and AI crop advice, together in one tool.",
            },
          },
          {
            icon: "Droplets",
            title: { fr: "Drones", en: "Drones" },
            text: {
              fr: "Prévu. Surveillance aérienne et pulvérisation des champs.",
              en: "Planned. Aerial monitoring and field spraying.",
            },
          },
          {
            icon: "Sprout",
            title: { fr: "Intrants", en: "Supplies" },
            text: {
              fr: "Prévu. Engrais, semences et outils pour les exploitations de toutes tailles.",
              en: "Planned. Fertilizer, seeds and tools for farms of every size.",
            },
          },
          {
            icon: "Globe",
            title: { fr: "API pour les partenaires", en: "API for partners" },
            text: {
              fr: "Prévu. Pour que coopératives, ONG et entreprises intègrent nos outils à leurs propres services.",
              en: "Planned. So cooperatives, NGOs and businesses can build our tools into their own services.",
            },
          },
        ],
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
          fr: "Parlez-nous de votre exploitation ou de votre organisation, et nous reviendrons vers vous.",
          en: "Tell us about your farm or organization and we’ll get back to you.",
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
