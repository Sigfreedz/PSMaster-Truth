-- 1. FRESH START (This deletes everything first so we can start clean)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.lessons CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Create Profiles table
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('student', 'admin')) DEFAULT 'student',
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create Lessons table
CREATE TABLE public.lessons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT,
    materials_link TEXT,
    tier TEXT CHECK (tier IN ('Beginner', 'Intermediate', 'Advanced')) NOT NULL,
    order_index SERIAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Enable RLS on Lessons
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND is_approved = true)
);
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND is_approved = true)
);

-- Lessons Policies
CREATE POLICY "Public can view lessons" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Admins can manage lessons" ON public.lessons FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND is_approved = true)
);

-- 7. Trigger Function for Profile Creation (AUTO-ADMIN LOGIC)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, is_approved)
    VALUES (
        NEW.id, 
        NEW.email,
        CASE 
            WHEN NEW.email LIKE '%@admin.com' OR NEW.email = 'hanselluis0809@gmail.com' THEN 'admin'
            ELSE 'student'
        END,
        CASE 
            WHEN NEW.email LIKE '%@admin.com' OR NEW.email = 'hanselluis0809@gmail.com' THEN TRUE -- Auto approve
            ELSE FALSE
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create the Trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Seed Data
DELETE FROM public.lessons;

INSERT INTO public.lessons (title, description, content, tier, order_index, steps)
VALUES 
(
  'How to Set Up a Professional Workspace', 
  'Customize your Photoshop environment for maximum efficiency and speed.', 
  '### The Professional Workspace\n\nA professional workspace is the foundation of a fast workflow. Photoshop allows you to save custom arrangements of panels and tools so you can focus on creativity instead of hunting for menus.\n\n**Key Areas**:\n1. **Tool Bar**: Located on the left.\n2. **Options Bar**: Dynamic bar at the top that changes based on your tool.\n3. **Panels**: The modules on the right (Layers, Channels, History).\n\n**Recommendation**:\nAlways keep your **Layers panel** visible. It is the most important part of any design project.', 
  'Beginner', 
  1, 
  '["Go to Window > Workspace > Essentials (Default)","Reset Essentials to ensure you have a clean slate","Drag panels you do not use into the center to close them","Go to Window > Workspace > New Workspace to save your layout"]'::jsonb
),
(
  'How to Use Layers to Organize Your Design', 
  'Learn the backbone of non-destructive editing and keep your projects manageable.', 
  '### The Power of Layers\n\nLayers are like sheets of stacked acetate. You can see through transparent areas of a layer to the layers below. They allow you to move, edit, and work with content on one layer without affecting the rest of the image.\n\n**Best Practices**:\n- **Name your layers**: Never leave them as "Layer 1", "Layer 2".\n- **Use Groups**: Organize related layers into folders.\n- **Color Code**: Right-click the eye icon to add a color tag.', 
  'Beginner', 
  2, 
  '["Create a new blank layer using the plus icon in the Layers panel","Double-click the layer name to rename it (e.g., Background, Logo)","Select multiple layers and press Ctrl/Cmd + G to group them","Adjust opacity to blend layers together"]'::jsonb
),
(
  'How to Navigate Your Canvas Like a Pro', 
  'Master the art of zooming, panning, and rotating your view without breaking your flow.', 
  '### Fluid Navigation\n\nSpeed in Photoshop comes from never having to touch a scroll bar. Using keyboard shortcuts for navigation allows you to keep your focus on the design.\n\n**Pro Shortcuts**:\n- **Spacebar**: Hold this down anytime to pan (Hand Tool).\n- **Ctrl/Cmd + + / -**: Zoom in and out.\n- **Z + Drag**: Scrubby zoom for granular control.\n- **R**: Rotate view (great for digital painting).', 
  'Beginner', 
  3, 
  '["Hold Spacebar and drag to move around your canvas","Hold Ctrl/Cmd and press + or - to jump zoom levels","Press Z and drag your mouse left or right to zoom smoothly","Press Ctrl/Cmd + 0 to instantly fit your design to the screen"]'::jsonb
),
(
  'How to Make Your First Selection with the Lasso Tool', 
  'Freehand selections are essential for organic shapes and quick edits.', 
  '### The Lasso Tool Set\n\nThe Lasso tools allow you to draw freeform, straight-edged, or "magnetic" selection borders. This is the first step in cutting out objects or applying localized adjustments.\n\n**Variations**:\n- **Lasso Tool**: Purely freehand.\n- **Polygonal Lasso**: Click point-to-point for straight lines.\n- **Magnetic Lasso**: "Snaps" to high-contrast edges.', 
  'Beginner', 
  4, 
  '["Select the Lasso Tool (L) from the toolbar","Draw a closed loop around the object you want to select","Hold Shift to add a second area to your current selection","Hold Alt/Opt to subtract a portion of your selection"]'::jsonb
),
(
  'How to Remove Backgrounds Using Quick Select', 
  'The fastest modern way to cut out subjects and create clean cutouts.', 
  '### Automatic Selections\n\nPhotoshop uses advanced AI to detect subjects. The Quick Selection Tool is the most efficient way to grab complex subjects like people or products.\n\n**The "Select Subject" Secret**:\nAt the top of the interface when any selection tool is active, you will see a button labeled **"Select Subject"**. This uses Adobe Sensei (AI) to automatically identify the most likely subject in your image.', 
  'Beginner', 
  5, 
  '["Select the Quick Selection Tool (W)","Paint over the area you want to select; it will automatically snap to edges","Click ''Select Subject'' in the top options bar for an AI-powered cutout","Click the Layer Mask icon to hide the background non-destructively"]'::jsonb
);

-- 10. RE-LINK EXISTING USER (Just in case you signed up already)
UPDATE public.profiles 
SET role = 'admin', is_approved = true 
WHERE email = 'hanselluis0809@gmail.com';
