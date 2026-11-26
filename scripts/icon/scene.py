"""3D app icon concepts for Haushaltsbuch Einfach, rendered with Blender (bpy, Cycles CPU).

Usage: python3 scene.py <concept A|B|C> <out.png> [res] [samples]
Renders the objects on a transparent film with a shadow catcher; compose.py puts
them on the brand teal.
"""
import math
import sys

import bpy
from mathutils import Vector

FONT = "/usr/share/fonts/opentype/inter/InterDisplay-ExtraBold.otf"

TEAL = (0.012, 0.25, 0.30, 1)        # #076070-ish in linear
TEAL_LIGHT = (0.006, 0.24, 0.31, 1)
CREAM = (0.86, 0.82, 0.72, 1)
PAPER = (0.90, 0.88, 0.82, 1)
GOLD = (1.0, 0.62, 0.20, 1)
GOLD_DARK = (0.62, 0.36, 0.06, 1)
CORAL = (0.90, 0.22, 0.16, 1)
GREEN = (0.10, 0.62, 0.32, 1)
INK = (0.10, 0.16, 0.18, 1)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.render.film_transparent = True
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "Medium High Contrast"
    return sc


def mat(name, color, metallic=0.0, rough=0.5, coat=0.0, sheen=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = color
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Coat Roughness"].default_value = 0.08
    b.inputs["Sheen Weight"].default_value = sheen
    return m


def split_mat(name, left, right, split_x, axis=0, rough=0.45, coat=0.3):
    """Two colours split along an object-space axis (teal spine wrap on a cream cover)."""
    m = mat(name, right, rough=rough, coat=coat)
    nt = m.node_tree
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    lt = nt.nodes.new("ShaderNodeMath")
    lt.operation = "LESS_THAN"
    lt.inputs[1].default_value = split_x
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs[6].default_value = right
    mix.inputs[7].default_value = left
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    nt.links.new(sep.outputs[axis], lt.inputs[0])
    nt.links.new(lt.outputs[0], mix.inputs[0])
    nt.links.new(mix.outputs[2], nt.nodes["Principled BSDF"].inputs["Base Color"])
    return m


def pages_mat():
    """Cream page edges with fine stripes."""
    m = mat("pages", PAPER, rough=0.7)
    nt = m.node_tree
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.bands_direction = "Y"
    wave.inputs["Scale"].default_value = 60
    wave.inputs["Distortion"].default_value = 0.0
    tc = nt.nodes.new("ShaderNodeTexCoord")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.80, 0.76, 0.66, 1)
    ramp.color_ramp.elements[1].color = PAPER
    ramp.color_ramp.elements[0].position = 0.3
    nt.links.new(tc.outputs["Object"], wave.inputs["Vector"])
    nt.links.new(wave.outputs["Fac"], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], nt.nodes["Principled BSDF"].inputs["Base Color"])
    return m


def box(name, size, loc, material, bevel=0.03, segs=6, rot=(0, 0, 0), parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        md = o.modifiers.new("bevel", "BEVEL")
        md.width = bevel
        md.segments = segs
        md.limit_method = "NONE"
    bpy.ops.object.shade_smooth()
    o.data.materials.append(material)
    if parent:
        o.parent = parent
    return o


def cyl(name, r, depth, loc, material, rot=(0, 0, 0), bevel=0.02, verts=96, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    if bevel:
        md = o.modifiers.new("bevel", "BEVEL")
        md.width = bevel
        md.segments = 5
        md.limit_method = "ANGLE"
    bpy.ops.object.shade_smooth()
    o.data.materials.append(material)
    if parent:
        o.parent = parent
    return o


def text(name, body, size, loc, material, rot=(math.radians(90), 0, 0), extrude=0.02, parent=None):
    cu = bpy.data.curves.new(name, "FONT")
    cu.body = body
    cu.font = bpy.data.fonts.load(FONT)
    cu.size = size
    cu.extrude = extrude
    cu.bevel_depth = 0.008
    cu.bevel_resolution = 3
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    o = bpy.data.objects.new(name, cu)
    bpy.context.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    o.data.materials.append(material)
    if parent:
        o.parent = parent
    return o


def empty(name, loc=(0, 0, 0), rot=(0, 0, 0)):
    o = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    return o


def euro_coin(name, r, loc, rot, m_gold, m_emboss, parent=None, thick=None):
    """A gold coin whose face points along local -Y; € and a rim ring raised on it."""
    root = empty(name, loc, rot)
    if parent:
        root.parent = parent
    t = thick or r * 0.16
    cyl(name + "_body", r, t, (0, 0, 0), m_gold, rot=(math.radians(90), 0, 0), bevel=t * 0.35, parent=root)
    bpy.ops.mesh.primitive_torus_add(major_radius=r * 0.80, minor_radius=r * 0.035,
                                     major_segments=128, minor_segments=16,
                                     location=(0, -t / 2, 0), rotation=(math.radians(90), 0, 0))
    ring = bpy.context.object
    bpy.ops.object.shade_smooth()
    ring.data.materials.append(m_emboss)
    ring.parent = root
    text(name + "_eur", "€", r * 1.05, (-r * 0.03, -t / 2 - 0.004, -r * 0.02), m_emboss,
         extrude=r * 0.045, parent=root)
    return root


def coin_flat(name, r, loc, m_gold, m_emboss, thick=None, rot_z=0.0, emboss=True):
    """A coin lying flat (face up)."""
    t = thick or r * 0.2
    root = empty(name, loc, (0, 0, rot_z))
    cyl(name + "_b", r, t, (0, 0, 0), m_gold, bevel=t * 0.3, parent=root)
    if emboss:
        bpy.ops.mesh.primitive_torus_add(major_radius=r * 0.80, minor_radius=r * 0.035,
                                         major_segments=96, minor_segments=12, location=(0, 0, t / 2))
        ring = bpy.context.object
        bpy.ops.object.shade_smooth()
        ring.data.materials.append(m_emboss)
        ring.parent = root
    return root


def lights_and_world(sc, key_energy=900):
    w = bpy.data.worlds.new("w")
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.42, 0.55, 0.58, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.55

    def area(name, loc, size, energy, color=(1, 1, 1), target=(0, 0, 0.8)):
        ld = bpy.data.lights.new(name, "AREA")
        ld.shape = "RECTANGLE"
        ld.size = size
        ld.size_y = size
        ld.energy = energy
        ld.color = color
        o = bpy.data.objects.new(name, ld)
        bpy.context.collection.objects.link(o)
        o.location = loc
        d = Vector(target) - Vector(loc)
        o.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        o.visible_glossy = False
        return o

    area("key", (-4.5, -5.5, 7.0), 5.0, key_energy, (1.0, 0.97, 0.92))
    area("fill", (5.5, -5.0, 2.5), 6.0, key_energy * 0.28, (0.85, 0.95, 1.0))
    area("rim", (2.5, 5.0, 6.0), 3.0, key_energy * 0.7, (1.0, 0.95, 0.85))

    # Soft boxes that only metal sees: give the gold long, clean highlights.
    for i, (loc, sz) in enumerate([((-3.0, -6.0, 4.5), (3.5, 1.2)), ((4.0, -5.0, 5.0), (1.2, 4.0))]):
        bpy.ops.mesh.primitive_plane_add(size=1, location=loc)
        p = bpy.context.object
        p.scale = (sz[0], sz[1], 1)
        d = Vector((0, 0, 1.0)) - Vector(loc)
        p.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
        em = bpy.data.materials.new(f"softbox{i}")
        em.use_nodes = True
        nt = em.node_tree
        for n in list(nt.nodes):
            if n.type == "BSDF_PRINCIPLED":
                nt.nodes.remove(n)
        e = nt.nodes.new("ShaderNodeEmission")
        e.inputs[1].default_value = 6.0
        nt.links.new(e.outputs[0], nt.nodes["Material Output"].inputs[0])
        p.data.materials.append(em)
        p.visible_camera = False
        p.visible_diffuse = False
        p.visible_shadow = False


def shadow_catcher(size=30):
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, 0))
    p = bpy.context.object
    p.is_shadow_catcher = True
    p.data.materials.append(mat("ground", (0.5, 0.5, 0.5, 1)))
    return p


def camera(sc, loc, target, lens=70, ortho=None):
    cd = bpy.data.cameras.new("cam")
    cd.lens = lens
    if ortho:
        cd.type = "ORTHO"
        cd.ortho_scale = ortho
    c = bpy.data.objects.new("cam", cd)
    bpy.context.collection.objects.link(c)
    c.location = loc
    d = Vector(target) - Vector(loc)
    c.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    sc.camera = c
    return c


def closed_book(root, w=1.5, h=2.0, t=0.44, cover_t=0.065, m_cover=None, m_spine=None, m_pages=None,
                ribbon=True, m_ribbon=None):
    """An upright closed book. Front cover faces -Y. Spine on -X. Bottom at z=0."""
    over = 0.045
    pw, ph, pt = w - over - 0.06, h - 2 * over, t - 2 * cover_t
    # pages block
    box("pages", (pw, pt, ph), (-w / 2 + 0.06 + pw / 2, 0, h / 2), m_pages, bevel=0.012, parent=root)
    # covers
    box("front", (w, cover_t, h), (0, -t / 2 + cover_t / 2, h / 2), m_cover, bevel=0.028, parent=root)
    box("back", (w, cover_t, h), (0, t / 2 - cover_t / 2, h / 2), m_spine, bevel=0.028, parent=root)
    # rounded spine
    sp = box("spine", (0.16, t, h), (-w / 2 + 0.05, 0, h / 2), m_spine, bevel=0.075, segs=10, parent=root)
    if ribbon:
        rb = box("ribbon", (0.12, 0.014, 0.5), (-0.1, -0.03, h - 0.04), m_ribbon, bevel=0.004, parent=root)
        rb.rotation_euler = (math.radians(4), 0, math.radians(-8))
    return root


# ----------------------------------------------------------------------------- concepts

def concept_a(sc):
    """Upright household book, gold euro coin popping off the cover, coral ribbon."""
    m_cover = split_mat("cover", TEAL_LIGHT, CREAM, -0.42)
    m_spine = mat("spine", TEAL_LIGHT, rough=0.4, coat=0.4)
    m_pages = pages_mat()
    m_gold = mat("gold", GOLD, metallic=1, rough=0.22)
    m_emb = mat("emb", (0.42, 0.22, 0.03, 1), metallic=0.85, rough=0.38)
    m_rib = mat("rib", CORAL, rough=0.55, sheen=0.5)

    root = empty("book", (0, 0, 0), (0, 0, math.radians(-22)))
    closed_book(root, m_cover=m_cover, m_spine=m_spine, m_pages=m_pages, m_ribbon=m_rib)
    euro_coin("coin", 0.56, (0.16, -0.36, 0.92), (math.radians(-6), math.radians(-10), 0), m_gold, m_emb,
              parent=root, thick=0.11)
    # a small stack of coins at the foot of the book
    for i in range(3):
        coin_flat(f"s{i}", 0.29, (0.86, -0.62, 0.032 + i * 0.062), m_gold, m_emb, thick=0.06,
                  rot_z=i * 0.7, emboss=(i == 2))
    camera(sc, (0.9, -10.0, 4.2), (0.24, 0, 1.0), lens=112)


def tick(name, loc, size, material, parent=None):
    """A raised check mark lying on a page: one round tube bent into a tick."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = size * 0.11
    cu.bevel_resolution = 6
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    pts = [(-size * 0.42, size * 0.12), (-size * 0.12, -size * 0.2), (size * 0.48, size * 0.42)]
    sp.points.add(len(pts) - 1)
    for p, (x, y) in zip(sp.points, pts):
        p.co = (x, y, 0, 1)
    o = bpy.data.objects.new(name, cu)
    bpy.context.collection.objects.link(o)
    o.location = loc
    o.data.materials.append(material)
    if parent:
        o.parent = parent
    return o


def concept_b(sc):
    """Open household book from above: entries paid (green tick) or open (coral dot), rising bars, coins."""
    m_paper = mat("paper", (0.80, 0.78, 0.72, 1), rough=0.8)
    m_cover = mat("cover", TEAL_LIGHT, rough=0.4, coat=0.4)
    m_gold = mat("gold", GOLD, metallic=1, rough=0.22)
    m_emb = mat("emb", (0.42, 0.22, 0.03, 1), metallic=0.85, rough=0.38)
    m_line = mat("line", (0.16, 0.30, 0.33, 1), rough=0.6)
    m_green = mat("green", GREEN, rough=0.35, coat=0.6)
    m_coral = mat("coral", CORAL, rough=0.35, coat=0.6)
    m_teal = mat("tealbar", TEAL_LIGHT, rough=0.35, coat=0.6)
    m_rib = mat("rib", CORAL, rough=0.55, sheen=0.5)

    root = empty("open", (0, 0, 0), (0, 0, math.radians(0)))
    box("cover", (3.36, 2.36, 0.08), (0, 0, 0.04), m_cover, bevel=0.035, parent=root)
    top = 0.24
    for side in (-1, 1):
        box(f"page{side}", (1.6, 2.2, 0.16), (side * 0.81, 0, 0.16), m_paper, bevel=0.035, parent=root)
    box("gutter", (0.05, 2.18, 0.02), (0, 0, top - 0.005), mat("gut", (0.45, 0.42, 0.36, 1), rough=0.9),
        bevel=0.004, parent=root)
    # left page: three entries, paid / paid / open
    for i, paid in enumerate([True, True, False]):
        y = 0.6 - i * 0.6
        box(f"row{i}", (0.8, 0.13, 0.035), (-0.62, y, top + 0.01), m_line, bevel=0.03, parent=root)
        if paid:
            tick(f"tick{i}", (-1.3, y, top + 0.05), 0.46, m_green, parent=root)
        else:
            cyl(f"dot{i}", 0.15, 0.06, (-1.3, y, top + 0.03), m_coral, bevel=0.015, parent=root)
    # right page: rising bars
    for i, hgt in enumerate([0.30, 0.48, 0.40, 0.72]):
        x = 0.36 + i * 0.32
        box(f"bar{i}", (0.2, 0.2, hgt), (x, 0.42, top + hgt / 2), m_teal if i < 3 else m_green,
            bevel=0.035, parent=root)
    # coin stack + one coin leaning on it
    for i in range(4):
        coin_flat(f"c{i}", 0.30, (1.02, -0.55, top + 0.032 + i * 0.064), m_gold, m_emb, thick=0.062,
                  rot_z=i, emboss=(i == 3))
    euro_coin("big", 0.42, (0.46, -0.58, top + 0.42), (math.radians(-22), 0, math.radians(12)), m_gold, m_emb,
              thick=0.085)
    box("ribbon", (0.14, 0.55, 0.014), (0.05, -1.3, top - 0.02), m_rib, bevel=0.004, parent=root)
    camera(sc, (0.0, -6.0, 8.0), (0.0, -0.22, 0.25), lens=94)


def concept_c(sc):
    """Upright book behind three growing coin stacks: the book, and the money it plans."""
    m_cover = split_mat("cover", TEAL_LIGHT, CREAM, -0.42)
    m_spine = mat("spine", TEAL_LIGHT, rough=0.4, coat=0.4)
    m_pages = pages_mat()
    m_gold = mat("gold", GOLD, metallic=1, rough=0.22)
    m_emb = mat("emb", (0.42, 0.22, 0.03, 1), metallic=0.85, rough=0.38)
    m_rib = mat("rib", CORAL, rough=0.55, sheen=0.5)
    m_label = mat("label", TEAL_LIGHT, rough=0.4, coat=0.4)

    root = empty("book", (-0.15, 0.35, 0), (0, 0, math.radians(-16)))
    closed_book(root, m_cover=m_cover, m_spine=m_spine, m_pages=m_pages, m_ribbon=m_rib)
    # label plate with € on the cover
    euro_coin("seal", 0.36, (0.18, -0.255, 1.38), (0, 0, 0), m_gold, m_emb, parent=root, thick=0.05)
    for s, n in enumerate([2, 4, 6]):
        for i in range(n):
            coin_flat(f"st{s}_{i}", 0.27, (-0.55 + s * 0.62, -0.75 + s * 0.06, 0.03 + i * 0.058),
                      m_gold, m_emb, thick=0.056, rot_z=i * 1.3 + s, emboss=(i == n - 1))
    camera(sc, (0.6, -10.0, 4.4), (0.12, 0, 0.92), lens=100)


def main():
    concept, out = sys.argv[1], sys.argv[2]
    res = int(sys.argv[3]) if len(sys.argv) > 3 else 1024
    samples = int(sys.argv[4]) if len(sys.argv) > 4 else 128
    sc = reset()
    lights_and_world(sc)
    shadow_catcher()
    {"A": concept_a, "B": concept_b, "C": concept_c}[concept](sc)
    sc.render.resolution_x = sc.render.resolution_y = res
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.render.filepath = out
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
