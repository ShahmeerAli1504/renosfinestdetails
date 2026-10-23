-- October 2026: new work photos (work-13 … work-27).
-- Adds them ahead of the original photos and makes the best nine the home-page selection.

update public.gallery_photos set show_on_home = false
where image_url in ('/assets/work-01.webp','/assets/work-02.webp','/assets/work-03.webp',
                    '/assets/work-04.webp','/assets/work-05.webp','/assets/work-06.webp');

insert into public.gallery_photos (image_url, alt, category, sort_order, show_on_home)
select v.image_url, v.alt, v.category, v.sort_order, v.show_on_home
from (values
  ('/assets/work-20.webp', 'Black Porsche Boxster convertible after detailing', 'vehicles', -150, true),
  ('/assets/work-15.webp', 'Gray Chevrolet Camaro with a fresh glossy finish', 'vehicles', -140, true),
  ('/assets/work-13.webp', 'Porsche interior with clean tan leather seats', 'interior', -130, true),
  ('/assets/work-16.webp', 'White Ford Expedition detailed at sunset', 'vehicles', -120, true),
  ('/assets/work-23.webp', 'Classic light-blue MGB roadster after detailing', 'vehicles', -110, true),
  ('/assets/work-18.webp', 'Kawasaki Ninja sport bike detailed and shining', 'fleet', -100, true),
  ('/assets/work-21.webp', 'Luxury diesel motorhome exterior detail', 'fleet', -90, true),
  ('/assets/work-25.webp', 'Truck cabin with conditioned brown leather seats', 'interior', -80, true),
  ('/assets/work-17.webp', 'Silver GMC Sierra Denali HD pickup after detailing', 'vehicles', -70, true),
  ('/assets/work-14.webp', 'Cruz Construction GMC work truck after detailing', 'vehicles', -60, false),
  ('/assets/work-26.webp', 'Pizzava delivery vehicle after detailing', 'vehicles', -50, false),
  ('/assets/work-19.webp', 'Class A motorhome exterior wash and detail', 'fleet', -40, false),
  ('/assets/work-22.webp', 'CAT skid steer loader cleaned and detailed', 'fleet', -30, false),
  ('/assets/work-24.webp', 'Cobalt boat on trailer after detailing', 'fleet', -20, false),
  ('/assets/work-27.webp', 'Polaris Ranger side-by-sides after detailing', 'fleet', -10, false)
) as v(image_url, alt, category, sort_order, show_on_home)
where not exists (select 1 from public.gallery_photos g where g.image_url = v.image_url);

-- work-02.webp was removed from the site; drop its gallery row.
delete from public.gallery_photos where image_url = '/assets/work-02.webp';
