import type { ComponentType, SVGProps } from 'react'
import {
  ShoppingBagIcon,
  DevicePhoneMobileIcon,
  LightBulbIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
  ComputerDesktopIcon,
  HomeModernIcon,
  BeakerIcon,
  TruckIcon,
  BookOpenIcon,
  HeartIcon,
  CameraIcon,
  MusicalNoteIcon,
  CakeIcon,
  BoltIcon,
  GiftIcon,
  ScissorsIcon,
  BuildingStorefrontIcon,
  TagIcon,
} from '@heroicons/react/24/outline'

const ICON_MAP: [RegExp, ComponentType<SVGProps<SVGSVGElement>>][] = [
  [/téléph|phone|mobile|gsm|simcard|sim card/i,      DevicePhoneMobileIcon],
  [/ordinat|laptop|informatiq|computer|pc\b|mac\b/i,  ComputerDesktopIcon],
  [/electro|électro|adaptateur|adapter|câble|cable|chargeur|prise|fiche/i, BoltIcon],
  [/ampoule|lumière|lumiere|éclairage|eclairage|led\b/i, LightBulbIcon],
  [/beauté|beaute|cosmétiq|cosmetiq|parfum|maquillage|soin|crème|creme/i, SparklesIcon],
  [/hygiène|hygiene|savon|shampo|dentif|brosse|papier|nettoy/i, HeartIcon],
  [/mode|vêtement|vetement|habit|tissu|couture|chemis|pantalon|robe|chaussure|sac à main/i, ShoppingBagIcon],
  [/alimenta|nourriture|épicerie|epicerie|produit local|céréale|cereale|farine|huile|sucre|sel\b/i, CakeIcon],
  [/boisson|eau\b|jus\b|soda|bière|biere|vin\b|lait\b|café|cafe|thé\b|the\b/i, BeakerIcon],
  [/machine|appareil|électromén|electromen|cuisinière|cuisiniere|réfrig|refrig|climatiseur|clim\b|ventilateur/i, WrenchScrewdriverIcon],
  [/meuble|maison|déco|deco|literie|rideau|tapis|vaisselle|cuisine\b/i, HomeModernIcon],
  [/auto|moto|voiture|véhicule|vehicule|pièce auto|transport/i, TruckIcon],
  [/livre|scolaire|école|ecole|bureau|papeterie|cartable|stylo/i, BookOpenIcon],
  [/photo|appareil photo|caméra|camera/i, CameraIcon],
  [/musique|son\b|audio|hifi|enceinte|casque/i, MusicalNoteIcon],
  [/jouet|enfant|bébé|bebe|puériculture|puericulture/i, GiftIcon],
  [/coiffure|perruque|extension|cheveux/i, ScissorsIcon],
  [/accessoire/i, TagIcon],
  [/divers|autre|général|general|tout\b/i, BuildingStorefrontIcon],
]

export function getCategoryIcon(name: string): ComponentType<SVGProps<SVGSVGElement>> {
  for (const [pattern, Icon] of ICON_MAP) {
    if (pattern.test(name)) return Icon
  }
  return TagIcon
}
