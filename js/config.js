/* EliteBiker Ride – nastavenia.
   Kým je SUPABASE_URL prázdne, aplikácia beží v skúšobnom režime (údaje len v tomto prehliadači).
   Tieto hodnoty sú verejné (nie sú to tajné kľúče) – tajné kľúče patria len do Supabase. */
window.EB_CONFIG = {
  SUPABASE_URL: "https://kfkbqamnblyitpugllps.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_nPZV_gvzoj2XA3O-nUEy6A_Ub0V03Pu", // verejný kľúč (bezpečný v prehliadači)
  VAPID_PUBLIC: "BEsQsa6Y9cJu6UlcjjCLhstRApJUrk-EBEA5_YITwctjfguPAfQakThh3majLmSMN0SiHnb0YB_c4Tlmu2Bn8MA", // verejný kľúč pre upozornenia
  APP_URL: "https://elitebikersk.github.io/elitebiker-ride/",
  LOGO_URL: "https://cdn.myshoptet.com/usr/www.elitebiker.sk/user/logos/logo-1.png",
  ESHOP_URL: "https://www.elitebiker.sk/",
  HOME: { lat: 49.1209, lng: 18.4215, label: "Považská Bystrica" }
};
