import { CampoNumero } from "../common/CampoNumero";
import React, { useState, useMemo } from "react";
import {
  Store,
  ShoppingBag,
  Search,
  Plus,
  Trash2,
  Check,
  Printer,
  Edit3,
  Image as ImageIcon,
  Camera,
  X,
  Package as PackageIcon,
  LayoutGrid,
  GlassWater,
  Dumbbell,
  Flame,
  Cookie,
  Backpack,
  Shirt,
  BarChart3 as BarChartIcon,
} from "lucide-react";
import { useGym } from "../../context/GymContext";
import { TelWhatsApp } from "../common/TelWhatsApp";
import { userCan } from "../../config/roles";
import { StockMovementScreen, KardexScreen, SalesReport } from "./StoreExtras";
import { buscarAlumno } from "../../utils/codigo";
import { filtrarAlumnos } from "../../utils/buscarPersona";
import { BotonesDescarga } from "../common/BotonesDescarga";
import { BotonVolver, BotonCerrar } from "../common/BarraVolver";
import { api } from "../../api/cliente";

export const PRESET_PRODUCT_IMAGES = [
  {
    name: "Agua Deportiva",
    url: "https://images.unsplash.com/photo-1559839914-1b396e6dd86f?w=400&q=80",
    cat: "bebidas",
  },
  {
    name: "Bebida Isotónica",
    url: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=400&q=80",
    cat: "bebidas",
  },
  {
    name: "Proteína Whey",
    url: "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=400&q=80",
    cat: "suplementos",
  },
  {
    name: "Creatina Micronizada",
    url: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&q=80",
    cat: "suplementos",
  },
  {
    name: "Pre-Entreno Energy",
    url: "https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=400&q=80",
    cat: "suplementos",
  },
  {
    name: "Barrita Proteica",
    url: "https://images.unsplash.com/photo-1622484216850-d7d8a6df2e21?w=400&q=80",
    cat: "snacks",
  },
  {
    name: "Vaso Shaker Pro",
    url: "https://images.unsplash.com/photo-1577221084712-45b0445b2b00?w=400&q=80",
    cat: "accesorios",
  },
  {
    name: "Guantes de Agarre",
    url: "https://images.unsplash.com/photo-1583473848882-f9a5bc7fd2ee?w=400&q=80",
    cat: "accesorios",
  },
  {
    name: "Toalla Microfibra",
    url: "https://images.unsplash.com/photo-1606902965551-dce093cda6e7?w=400&q=80",
    cat: "ropa",
  },
];

const TONO_CAJA = {
  emerald: ["bg-emerald-50 border-emerald-200", "text-emerald-700", "text-emerald-800"],
  amber: ["bg-amber-50 border-amber-200", "text-amber-700", "text-amber-800"],
  rose: ["bg-rose-50 border-rose-200", "text-rose-700", "text-rose-800"],
  slate: ["bg-slate-50 border-slate-200", "text-slate-600", "text-slate-800"],
};

// Ícono de línea de la categoría (cuando el producto no tiene foto)
const IconoCategoriaProducto = ({ icono: I = PackageIcon, clase }) => <I className={`${clase} text-slate-400`} strokeWidth={1.6} />;

export const StorePOS = ({ onAbrirCaja }) => {
  const {
    currentUser,
    cashShift,
    products,
    members,
    addProduct,
    updateProduct,
    deleteProduct,
    moveStock,
    processPOSSale,
    refreshProducts,
    refreshTransactions,
    refreshCashShift,
    lowStockProducts,
  } = useGym();
  const refreshAll = () => {
    refreshProducts?.();
    refreshTransactions?.();
    refreshCashShift?.();
  };
  // Recepción solo cobra con su caja abierta
  const cajaCerrada = currentUser?.role === "reception" && cashShift && !cashShift.open;

  // Ticket recién cobrado: corregir (anula y devuelve los productos al carrito) o anular
  const [accionTicket, setAccionTicket] = useState(null); // null | "anular" | "corregir"
  const [motivoTicket, setMotivoTicket] = useState("");
  const [errorTicket, setErrorTicket] = useState("");
  const [procesandoTicket, setProcesandoTicket] = useState(false);
  const cerrarTicket = () => {
    setLastReceipt(null);
    setAccionTicket(null);
    setMotivoTicket("");
    setErrorTicket("");
  };
  const ejecutarAccionTicket = async (e) => {
    e?.preventDefault?.();
    if (!lastReceipt?.id) return;
    const motivo = accionTicket === "corregir" ? `Corrección de venta${motivoTicket.trim() ? `: ${motivoTicket.trim()}` : ""}` : motivoTicket.trim();
    if (motivo.length < 3) return setErrorTicket("Escribe el motivo de la anulación.");
    setProcesandoTicket(true);
    setErrorTicket("");
    try {
      const anulada = await api(`/tienda/ventas/${lastReceipt.id}/anular`, { method: "POST", body: { motivo } });
      refreshAll();
      if (accionTicket === "corregir") {
        // Los productos vuelven al carrito para cambiar lo que haga falta y cobrar de nuevo
        const nuevo = (lastReceipt.items || [])
          .map((it) => {
            const prod = products.find((p) => String(p.id) === String(it.productId));
            return prod ? { product: { ...prod, stock: Number(prod.stock || 0) + Number(it.quantity || 0) }, quantity: Number(it.quantity || 1) } : null;
          })
          .filter(Boolean);
        setCart(nuevo);
        if (lastReceipt.memberId) setSelectedMemberId(lastReceipt.memberId);
        else if (lastReceipt.customer && !/cliente (general|mostrador)/i.test(lastReceipt.customer)) setCustomCustomerName(lastReceipt.customer);
        setPaymentMethod?.(lastReceipt.paymentMethod || paymentMethod);
        setActiveTab("pos");
        cerrarTicket();
      } else {
        setLastReceipt((r) => ({ ...r, ...anulada, amount: anulada?.total ?? r.amount, relatedMemberName: r.relatedMemberName, voided: true }));
        setAccionTicket(null);
        setMotivoTicket("");
      }
    } catch (er) {
      setErrorTicket(er.message);
    } finally {
      setProcesandoTicket(false);
    }
  };

  const [activeTab, setActiveTab] = useState("pos");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Cart State
  const [cart, setCart] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [customCustomerName, setCustomCustomerName] = useState("");
  const [tipoCliente, setTipoCliente] = useState("externo"); // externo | alumno
  const [buscaAlumno, setBuscaAlumno] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [lastReceipt, setLastReceipt] = useState(null);
  const [cobrando, setCobrando] = useState(false);
  const [errorVenta, setErrorVenta] = useState("");
  const [errorProducto, setErrorProducto] = useState("");
  const [guardandoProducto, setGuardandoProducto] = useState(false);
  const [prodBarcode, setProdBarcode] = useState("");
  const [movimiento, setMovimiento] = useState(null); // producto para entrada/ajuste
  const [kardexDe, setKardexDe] = useState(null); // producto para ver kárdex
  // Permisos de la tienda según el usuario conectado
  const puedeCrear = userCan(currentUser, "store", "crear");
  const puedeEditar = userCan(currentUser, "store", "editar");
  const puedeEliminar = userCan(currentUser, "store", "eliminar") || userCan(currentUser, "finance", "eliminar");

  // New Product Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [prodName, setProdName] = useState("");
  const [prodCategory, setProdCategory] = useState("bebidas");
  const [prodBrand, setProdBrand] = useState("");
  const [prodCost, setProdCost] = useState(2.0);
  const [prodPrice, setProdPrice] = useState(5.0);
  const [prodStock, setProdStock] = useState(20);
  const [prodMinStock, setProdMinStock] = useState(5);
  const [prodDesc, setProdDesc] = useState("");
  const [prodImage, setProdImage] = useState("");

  const categories = [
    { id: "all", label: "Todos", icon: LayoutGrid },
    { id: "bebidas", label: "Bebidas & Aguas", icon: GlassWater },
    { id: "suplementos", label: "Proteínas & Suplementos", icon: Dumbbell },
    { id: "quemadores", label: "Quemadores & Termogénicos", icon: Flame },
    { id: "snacks", label: "Snacks & Barras", icon: Cookie },
    { id: "accesorios", label: "Accesorios Gym", icon: Backpack },
    { id: "ropa", label: "Indumentaria", icon: Shirt },
  ];

  // Real-time filter by name, brand, category, or description
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === "all" || p.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!term) return true;

      const catObj = categories.find((c) => c.id === p.category);
      const catLabel = catObj ? catObj.label.toLowerCase() : "";
      const catId = p.category ? p.category.toLowerCase() : "";
      const brandStr = p.brand ? p.brand.toLowerCase() : "";
      const nameStr = p.name ? p.name.toLowerCase() : "";
      const descStr = p.description ? p.description.toLowerCase() : "";

      return (
        nameStr.includes(term) ||
        brandStr.includes(term) ||
        catId.includes(term) ||
        catLabel.includes(term) ||
        descStr.includes(term)
      );
    });
  }, [products, selectedCategory, searchTerm]);

  // Add to cart
  const handleAddToCart = (product) => {
    if (product.stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(
            `No hay más stock disponible de ${product.name} (Stock: ${product.stock})`,
          );
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  // Update quantity in cart
  const handleUpdateQty = (productId, delta) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.stock) {
              alert(`Stock máximo alcanzado (${item.product.stock})`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  // Remove from cart
  const handleRemoveFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Clear cart
  const handleClearCart = () => setCart([]);

  // Calculate totals
  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.salePrice * item.quantity,
    0,
  );
  const total = subtotal;

  const alumnoVenta = members.find((m) => m.id === selectedMemberId) || null;
  const sugerenciasAlumno = useMemo(() => {
    const t = buscaAlumno.trim();
    if (tipoCliente !== "alumno" || !t || selectedMemberId) return [];
    return filtrarAlumnos(members, t).slice(0, 8);
  }, [buscaAlumno, members, tipoCliente, selectedMemberId]);

  // Checkout
  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0 || cajaCerrada || cobrando) return;
    setErrorVenta("");
    setCobrando(true);
    let receipt;
    try {
      receipt = await processPOSSale(
        cart,
        paymentMethod,
        selectedMemberId || undefined,
        customCustomerName.trim() || undefined,
      );
    } catch (er) {
      setErrorVenta(er.message);
      setCobrando(false);
      return;
    }
    setCobrando(false);


    setLastReceipt(receipt);
    setCart([]);
    setSelectedMemberId("");
    setCustomCustomerName("");
    setBuscaAlumno("");
  };

  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setProdName("");
    setProdCategory("suplementos");
    setProdBrand("");
    setProdCost(50);
    setProdPrice(80);
    setProdStock(15);
    setProdMinStock(5);
    setProdDesc("");
    setProdImage("");
    setProdBarcode("");
    setErrorProducto("");
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdCategory(prod.category);
    setProdBrand(prod.brand);
    setProdCost(prod.purchaseCost);
    setProdPrice(prod.salePrice);
    setProdStock(prod.stock);
    setProdMinStock(prod.minStockAlert);
    setProdDesc(prod.description);
    setProdImage(prod.image || "");
    setProdBarcode(prod.barcode || "");
    setErrorProducto("");
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!prodName.trim() || guardandoProducto) return;
    const datos = {
      name: prodName.trim(),
      category: prodCategory,
      brand: prodBrand,
      purchaseCost: Number(prodCost) || 0,
      salePrice: Number(prodPrice) || 0,
      stock: Number(prodStock) || 0,
      minStockAlert: Number(prodMinStock) || 0,
      description: prodDesc,
      barcode: prodBarcode.trim(),
      image: prodImage.trim() || "",
    };
    setGuardandoProducto(true);
    setErrorProducto("");
    try {
      if (editingProduct) await updateProduct(editingProduct.id, datos);
      else await addProduct(datos);
      setIsProductModalOpen(false);
    } catch (er) {
      setErrorProducto(er.message);
    } finally {
      setGuardandoProducto(false);
    }
  };

  // Escáner o búsqueda + Enter: agrega el producto con ese código de barras
  // (o el único resultado de la búsqueda) al carrito
  const handleSearchEnter = (e) => {
    if (e.key !== "Enter") return;
    const q = searchTerm.trim().toLowerCase();
    if (!q) return;
    const exacto = products.find((p) => (p.barcode || "").toLowerCase() === q);
    const candidatos = exacto ? [exacto] : filteredProducts;
    if (candidatos.length === 1) {
      handleAddToCart(candidatos[0]);
      setSearchTerm("");
    }
  };

  // Pantallas completas de inventario
  if (movimiento)
    return (
      <StockMovementScreen
        product={movimiento}
        puedeAjustar={puedeEditar}
        onVolver={() => setMovimiento(null)}
        onGuardar={async (m) => {
          await moveStock(movimiento.id, m);
          setMovimiento(null);
        }}
      />
    );
  if (kardexDe) return <KardexScreen product={kardexDe} onVolver={() => setKardexDe(null)} />;

  return (
    <div className="space-y-4 pb-8">
      {cajaCerrada && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900">
          <span className="text-sm font-bold">La caja está cerrada. Abre tu turno para poder cobrar.</span>
          {onAbrirCaja && (
            <button
              type="button"
              onClick={onAbrirCaja}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black cursor-pointer"
            >
              Ir a abrir mi caja
            </button>
          )}
        </div>
      )}
      {/* Top Header */}
      <div className="rd-portada rd-cabecera flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-0.5">
            <Store className="w-3.5 h-3.5" />
            <span>Tienda</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            Ventas
          </h1>
          <p className="text-xs text-gray-500">
            Bebidas, suplementos y accesorios: cobro, inventario y reportes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub tabs */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setActiveTab("pos")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                activeTab === "pos"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-slate-900"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Productos
            </button>
            <button
              onClick={() => setActiveTab("inventory")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                activeTab === "inventory"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-slate-900"
              }`}
            >
              <PackageIcon className="w-3.5 h-3.5" /> Inventario & Stock ({products.length})
            </button>
            <button
              onClick={() => setActiveTab("sales")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                activeTab === "sales" ? "bg-blue-600 text-white shadow-xs" : "text-gray-600 hover:text-slate-900"
              }`}
            >
              <BarChartIcon className="w-3.5 h-3.5" /> Ventas & Reportes
            </button>
          </div>

          {puedeCrear && <button
            onClick={handleOpenNewProduct}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Producto</span>
          </button>}
        </div>
      </div>

      {/* POS TERMINAL TAB */}
      {activeTab === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] 2xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
          {/* Productos (a la izquierda) y carrito fijo a la derecha */}
          <div className="min-w-0 space-y-3">
            {/* Real-time Search & Category Filters */}
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs space-y-3">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-blue-600 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar o escanear código de barras (Enter agrega al carrito)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchEnter}
                  autoFocus
                  className="w-full pl-9 pr-24 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-slate-900 placeholder-gray-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all font-medium"
                />

                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 px-2 py-1 rounded text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-gray-200 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Limpiar</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 max-w-full">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1 transition-all ${
                        selectedCategory === cat.id
                          ? "bg-blue-600 text-white shadow-xs ring-1 ring-blue-600"
                          : "bg-gray-100 text-gray-600 hover:text-slate-900 border border-gray-200 hover:bg-gray-200"
                      }`}
                    >
                      <cat.icon className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>
                    {filteredProducts.length} de {products.length} productos
                  </span>
                </div>
              </div>
            </div>

            {/* Empty search results state */}
            {filteredProducts.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    No se encontraron productos
                  </h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                    No hay productos que coincidan con &quot;{searchTerm}&quot;
                    en la categoría seleccionada.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("all");
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Restablecer búsqueda</span>
                </button>
              </div>
            )}

            {/* Product Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {filteredProducts.map((prod) => {
                const isOutOfStock = prod.stock <= 0;
                const isLowStock = prod.stock <= prod.minStockAlert;

                return (
                  <div
                    key={prod.id}
                    onClick={() => !isOutOfStock && handleAddToCart(prod)}
                    className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer group shadow-xs min-w-0 ${
                      isOutOfStock
                        ? "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
                        : "bg-white border-gray-200 hover:border-blue-500 hover:shadow-sm"
                    }`}
                  >
                    <div>
                      {/* Product Image Thumbnail */}
                      <div className="w-full h-20 bg-gray-100 rounded-lg mb-1.5 overflow-hidden relative flex items-center justify-center border border-gray-100">
                        {prod.image ? (
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              // Fallback on load error
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <IconoCategoriaProducto icono={categories.find((c) => c.id === prod.category)?.icon} clase="w-9 h-9" />
                        )}
                        {isOutOfStock ? (
                          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center">
                            <span className="text-white text-xs font-black uppercase bg-rose-600 px-2 py-0.5 rounded shadow-sm">
                              Agotado
                            </span>
                          </div>
                        ) : isLowStock ? (
                          <div className="absolute top-1 right-1">
                            <span className="text-xs font-extrabold uppercase bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded shadow-sm animate-pulse">
                              ¡Stock Bajo!
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase truncate min-w-0 flex-1">
                          {prod.brand}
                        </span>
                        <span
                          className={`shrink-0 whitespace-nowrap text-[10px] font-bold px-1 py-0.2 rounded border ${
                            isOutOfStock
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : isLowStock
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {isOutOfStock ? "0 un." : `${prod.stock} un.`}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[32px]">
                        {prod.name}
                      </h4>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-sm font-bold text-blue-700 font-mono">
                        S/ {prod.salePrice.toFixed(2)}
                      </span>

                      <button
                        type="button"
                        disabled={isOutOfStock}
                        className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* POS Cart Sidebar (1 Col) */}
          <div className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col justify-between h-fit sticky top-16 shadow-xs">
            <div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-2.5 mb-3">
                <div className="flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Ticket de Venta
                  </h3>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-xs text-gray-400 hover:text-rose-600 cursor-pointer"
                  >
                    Vaciar
                  </button>
                )}
              </div>

              {/* Cliente: externo o alumno matriculado */}
              <div className="space-y-1.5 mb-3 text-xs">
                <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100">
                  {[
                    ["externo", "Cliente externo"],
                    ["alumno", "Alumno matriculado"],
                  ].map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setTipoCliente(k);
                        setSelectedMemberId("");
                        setCustomCustomerName("");
                        setBuscaAlumno("");
                      }}
                      className={`py-1.5 rounded-md font-bold cursor-pointer ${tipoCliente === k ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-white"}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                {tipoCliente === "externo" ? (
                  <input
                    type="text"
                    placeholder="Nombre del cliente (opcional)..."
                    value={customCustomerName}
                    onChange={(e) => setCustomCustomerName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-slate-900 placeholder-gray-400 focus:outline-none focus:border-blue-600"
                  />
                ) : alumnoVenta ? (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 truncate">{alumnoVenta.fullName}</p>
                      <p className="text-[11px] text-slate-600">
                        <b className="font-mono text-blue-700">{alumnoVenta.codeLabel}</b> · DNI {alumnoVenta.dni}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        {alumnoVenta.planName || "Sin plan"} ·{" "}
                        <span className={alumnoVenta.status === "active" ? "text-emerald-700 font-bold" : alumnoVenta.status === "expiring_soon" ? "text-amber-700 font-bold" : "text-rose-700 font-bold"}>
                          {{ active: "Vigente", expiring_soon: "Por vencer", expired: "Vencido", frozen: "Congelado" }[alumnoVenta.status] || alumnoVenta.status}
                        </span>
                        {alumnoVenta.phone ? <> · <TelWhatsApp tel={alumnoVenta.phone} /></> : ""}
                      </p>
                    </div>
                    <button type="button" onClick={() => { setSelectedMemberId(""); setBuscaAlumno(""); }} className="text-slate-400 hover:text-rose-600 cursor-pointer" title="Cambiar alumno">
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Código (DF-1), DNI o nombre del alumno"
                      value={buscaAlumno}
                      onChange={(e) => setBuscaAlumno(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const h = buscarAlumno(members, buscaAlumno)?.member;
                          if (h) setSelectedMemberId(h.id);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-slate-900 placeholder-gray-400 focus:outline-none focus:border-blue-600"
                    />
                    {sugerenciasAlumno.length > 0 && (
                      <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {sugerenciasAlumno.map((m) => (
                          <li key={m.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedMemberId(m.id)}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 cursor-pointer"
                            >
                              <b className="font-mono text-blue-700 mr-1.5">{m.codeLabel}</b>
                              {m.fullName}
                              <span className="text-slate-400"> · {m.dni}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {buscaAlumno.trim().length >= 2 && sugerenciasAlumno.length === 0 && (
                      <p className="text-[11px] text-rose-600 mt-1">No hay alumnos con ese código, DNI o nombre.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Cart items list */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 mb-3">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs">
                    <ShoppingBag className="w-7 h-7 text-gray-300 mx-auto mb-1.5" />
                    El carrito está vacío.
                    <br />
                    Haz clic en un producto para añadirlo.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="p-2 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between gap-2 text-xs"
                    >
                      {/* Thumbnail */}
                      <div className="w-8 h-8 rounded bg-white border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.product.image ? (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm">📦</span>
                        )}
                      </div>

                      <div className="flex-1 truncate">
                        <p className="font-semibold text-slate-800 truncate">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          S/ {item.product.salePrice.toFixed(2)} c/u
                        </p>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleUpdateQty(item.product.id, -1)}
                          className="w-5 h-5 rounded bg-white border border-gray-300 text-slate-700 hover:bg-gray-100 flex items-center justify-center text-xs cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-mono font-bold text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQty(item.product.id, 1)}
                          className="w-5 h-5 rounded bg-white border border-gray-300 text-slate-700 hover:bg-gray-100 flex items-center justify-center text-xs cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-blue-700 font-mono text-xs">
                          S/{" "}
                          {(item.product.salePrice * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Payment & Checkout Footer */}
            {cart.length > 0 && (
              <form
                onSubmit={handleCheckout}
                className="space-y-3 pt-2.5 border-t border-gray-200 text-xs"
              >
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="yape_plin">📱 Yape / Plin</option>
                  </select>
                </div>

                {errorVenta && (
                  <p className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">{errorVenta}</p>
                )}
                <div className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-100 flex items-center justify-between">
                  <span className="text-xs text-gray-600 font-medium">
                    Total a Cobrar:
                  </span>
                  <span className="text-lg font-bold text-blue-700 font-mono">
                    S/ {total.toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={cajaCerrada || cobrando}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-md shadow-xs text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{cajaCerrada ? "Abre la caja para cobrar" : cobrando ? "Registrando venta…" : "Cobrar & Generar Ticket"}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* INVENTORY TAB */}
      {activeTab === "inventory" && (
        <div className="space-y-3">
          {/* Inventory Search & Filters */}
          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-blue-600 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Filtrar inventario en tiempo real por nombre, marca o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-20 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-slate-900 placeholder-gray-400 focus:outline-none focus:border-blue-600 focus:bg-white"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-2 px-2 py-0.5 rounded text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-gray-200 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpiar</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1 transition-all ${
                    selectedCategory === cat.id
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:text-slate-900 border border-gray-200"
                  }`}
                >
                  <cat.icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500 font-bold">
                    <th className="p-3">Imagen</th>
                    <th className="p-3">Producto</th>
                    <th className="p-3">Categoría</th>
                    <th className="p-3">Costo Compra</th>
                    <th className="p-3">Precio Venta</th>
                    <th className="p-3">Margen Ganancia</th>
                    <th className="p-3">Stock Actual & Alertas</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map((prod) => {
                    const purchaseCost = prod.purchaseCost ?? 0;
                    const salePrice = prod.salePrice ?? 0;
                    const margin = salePrice - purchaseCost;
                    const marginPercent =
                      salePrice > 0
                        ? ((margin / salePrice) * 100).toFixed(0)
                        : "0";
                    const isOutOfStock = (prod.stock ?? 0) <= 0;
                    const isLowStock =
                      (prod.stock ?? 0) <= (prod.minStockAlert ?? 0);

                    return (
                      <tr
                        key={prod.id}
                        className="hover:bg-gray-50/70 transition-colors"
                      >
                        <td className="p-3">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                            {prod.image ? (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <IconoCategoriaProducto icono={categories.find((c) => c.id === prod.category)?.icon} clase="w-5 h-5" />
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-bold text-slate-900">
                              {prod.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {prod.brand} • {prod.description}
                            </p>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="capitalize px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs border border-gray-200">
                            {prod.category}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-gray-600">
                          S/ {purchaseCost.toFixed(2)}
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-700">
                          S/ {salePrice.toFixed(2)}
                        </td>
                        <td className="p-3">
                          <span className="text-emerald-700 font-bold font-mono text-xs">
                            +S/ {margin.toFixed(2)} ({marginPercent}%)
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="min-w-10 px-2 py-0.5 rounded bg-gray-50 border border-gray-200 text-center text-slate-900 font-mono font-bold">
                              {prod.stock}
                            </span>
                            {puedeCrear && (
                              <button
                                type="button"
                                onClick={() => setMovimiento(prod)}
                                className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold cursor-pointer"
                                title="Ingreso de mercadería, merma o inventario físico"
                              >
                                ± Stock
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setKardexDe(prod)}
                              className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold cursor-pointer"
                              title="Historial de entradas y salidas"
                            >
                              Kárdex
                            </button>
                            {isOutOfStock ? (
                              <span className="text-xs font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                                ¡Agotado!
                              </span>
                            ) : isLowStock ? (
                              <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.2 rounded animate-pulse">
                                ¡Stock Bajo (Min: {prod.minStockAlert})!
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                OK
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {puedeEditar && <button
                              onClick={() => handleOpenEditProduct(prod)}
                              className="p-1 text-gray-400 hover:text-slate-800 rounded hover:bg-gray-100 cursor-pointer"
                              title="Editar producto"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>}
                            {puedeEliminar && <button
                              onClick={() => {
                                if (confirm(`¿Quitar ${prod.name} de la tienda? Su historial de ventas se conserva.`)) {
                                  deleteProduct(prod.id);
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-rose-600 rounded hover:bg-gray-100 cursor-pointer"
                              title="Eliminar producto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VENTAS & REPORTES */}
      {activeTab === "sales" && (
        <SalesReport puedeAnular={puedeEliminar} onReimprimir={setLastReceipt} onCambio={refreshAll} />
      )}

      {/* Product Create / Edit Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
          <div className="w-full max-w-3xl mx-auto min-h-full sm:px-8 sm:py-8 bg-white p-5 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="text-sm font-bold text-slate-900">
                {editingProduct
                  ? "Editar Producto"
                  : "Añadir Producto a Tienda"}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSaveProduct}
              className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3 my-3 text-xs max-w-5xl mx-auto items-start"
            >
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Creatina Monohidratada 300g"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Categoría
                  </label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="bebidas">Bebidas & Aguas</option>
                    <option value="suplementos">Suplementos & Proteínas</option>
                    <option value="quemadores">Quemadores & Termogénicos</option>
                    <option value="snacks">Snacks & Barras</option>
                    <option value="accesorios">
                      Accesorios de Entrenamiento
                    </option>
                    <option value="ropa">Indumentaria</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Marca / Laboratorio
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Optimum Nutrition"
                    value={prodBrand}
                    onChange={(e) => setProdBrand(e.target.value)}
                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Código de barras (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Escanéalo o escríbelo"
                  value={prodBarcode}
                  onChange={(e) => setProdBarcode(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-slate-900 font-mono focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Costo Compra (S/)
                  </label>
                  <CampoNumero
                    type="number"
                    step="0.1"
                    min="0"
                    value={prodCost}
                    onChange={(e) => setProdCost(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Precio Venta (S/) *
                  </label>
                  <CampoNumero
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-slate-900 font-bold text-blue-700 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {editingProduct ? "Stock actual (si cambia, queda como ajuste en el kárdex)" : "Stock inicial"}
                    </label>
                    <CampoNumero
                      type="number"
                      min="0"
                      value={prodStock}
                      onChange={(e) => setProdStock(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Alerta de Stock Mínimo
                    </label>
                    <CampoNumero
                      type="number"
                      min="1"
                      value={prodMinStock}
                      onChange={(e) => setProdMinStock(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Descripción Breve
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Ej. Botella 750ml con tapa deportiva"
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-slate-900 resize-none focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* IMAGEN DEL PRODUCTO (URL & PRESETS FIT) */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-800 font-bold text-xs flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <span>Imagen del Producto</span>
                  </label>
                  {prodImage && (
                    <button
                      type="button"
                      onClick={() => setProdImage("")}
                      className="text-xs text-rose-600 hover:underline cursor-pointer"
                    >
                      Quitar imagen
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Live Preview */}
                  <div className="w-16 h-16 rounded-lg bg-white border border-gray-300 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                    {prodImage ? (
                      <img
                        src={prodImage}
                        alt="Vista previa"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <Camera className="w-6 h-6 text-gray-300" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <input
                      type="url"
                      placeholder="https://ejemplo.com/foto-producto.jpg"
                      value={prodImage}
                      onChange={(e) => setProdImage(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                    />

                    <p className="text-xs text-gray-500">
                      Pega el enlace de una foto o elige una de la galería.
                    </p>
                  </div>
                </div>

                {/* Galería: imágenes ya usadas en productos + imágenes de referencia */}
                {(() => {
                  const usadas = [...new Map(products.filter((p) => p.image).map((p) => [p.image, p.name])).entries()].slice(0, 24);
                  const Miniatura = ({ url, nombre }) => (
                    <button
                      type="button"
                      title={nombre}
                      onClick={() => setProdImage(url)}
                      className={`w-12 h-12 rounded-lg overflow-hidden border-2 bg-white cursor-pointer shrink-0 ${prodImage === url ? "border-blue-600 ring-2 ring-blue-200" : "border-gray-200 hover:border-blue-400"}`}
                    >
                      <img src={url} alt={nombre} className="w-full h-full object-cover" loading="lazy" onError={(e) => (e.target.style.opacity = 0.2)} />
                    </button>
                  );
                  return (
                    <div className="space-y-2">
                      {usadas.length > 0 && (
                        <div>
                          <span className="text-xs font-bold text-gray-500 block mb-1">Imágenes de tus productos ({usadas.length}) · toca una para reutilizarla</span>
                          <div className="flex flex-wrap gap-1.5">
                            {usadas.map(([url, nombre]) => (
                              <Miniatura key={url} url={url} nombre={nombre} />
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <span className="text-xs font-bold text-gray-500 block mb-1">Galería de imágenes de referencia</span>
                        <div className="flex flex-wrap gap-1.5">
                          {PRESET_PRODUCT_IMAGES.filter((p) => prodCategory === "quemadores" ? ["suplementos", "quemadores"].includes(p.cat) : !p.cat || p.cat === prodCategory || prodCategory === "").map((preset) => (
                            <Miniatura key={preset.url} url={preset.url} nombre={preset.name} />
                          ))}
                          {PRESET_PRODUCT_IMAGES.filter((p) => p.cat && p.cat !== prodCategory).length > 0 && (
                            <details className="w-full">
                              <summary className="text-[11px] font-bold text-blue-700 cursor-pointer">Ver imágenes de otras categorías</summary>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {PRESET_PRODUCT_IMAGES.filter((p) => p.cat && p.cat !== prodCategory).map((preset) => (
                                  <Miniatura key={preset.url} url={preset.url} nombre={preset.name} />
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Precio sugerido y productos parecidos: ayudan a fijar el precio */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <span className="block text-slate-800 font-bold text-xs mb-2">Precio sugerido según margen</span>
                <div className="grid grid-cols-3 gap-2">
                  {[25, 35, 50].map((m) => {
                    const sug = Number(prodCost) > 0 ? Math.ceil((Number(prodCost) / (1 - m / 100)) * 2) / 2 : 0;
                    const activo = sug > 0 && Number(prodPrice) === sug;
                    return (
                      <button key={m} type="button" disabled={!sug} onClick={() => setProdPrice(sug)}
                        className={`rounded-lg border px-2 py-1.5 text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${activo ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200 hover:border-blue-300"}`}>
                        <span className="block text-[10px] font-bold uppercase text-slate-500">Margen {m} %</span>
                        <span className="block text-sm font-black font-mono text-slate-900">{sug ? `S/ ${sug.toFixed(2)}` : "—"}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">Toca uno para usarlo como precio de venta (se calcula desde el costo de compra).</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <span className="block text-slate-800 font-bold text-xs mb-2">Productos parecidos en tu tienda</span>
                {(() => {
                  const parecidos = (products || []).filter((x) => x.category === prodCategory && (!editingProduct || x.id !== editingProduct.id)).slice(0, 3);
                  if (!parecidos.length) return <p className="text-[11px] text-slate-500">Aún no hay otros productos en esta categoría.</p>;
                  return (
                    <ul className="space-y-1">
                      {parecidos.map((x) => (
                        <li key={x.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate text-slate-700">{x.name}</span>
                          <span className="shrink-0 font-mono font-bold text-slate-900">S/ {Number(x.salePrice || 0).toFixed(2)} <span className="font-sans font-semibold text-slate-500">· {x.stock ?? 0} un.</span></span>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>

              {/* Vista previa y rentabilidad: así se verá en la tienda y cuánto deja */}
              {(() => {
                const costo = Number(prodCost) || 0;
                const precio = Number(prodPrice) || 0;
                const stock = Number(prodStock) || 0;
                const gan = precio - costo;
                const margen = precio > 0 ? (gan / precio) * 100 : 0;
                const tono = gan <= 0 ? "rose" : margen < 20 ? "amber" : "emerald";
                const cat = categories.find((c) => c.id === prodCategory);
                return (
                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-[230px_1fr] gap-4 pt-3 border-t border-gray-200">
                    <div>
                      <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Así se verá en la tienda</span>
                      <div className="p-2.5 rounded-xl border border-gray-200 bg-white shadow-xs">
                        <div className="w-full h-24 bg-gray-100 rounded-lg mb-1.5 overflow-hidden flex items-center justify-center border border-gray-100">
                          {prodImage ? <img src={prodImage} alt="" className="w-full h-full object-cover" onError={(e) => (e.target.style.display = "none")} /> : <IconoCategoriaProducto icono={cat?.icon} clase="w-9 h-9" />}
                        </div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase truncate">{prodBrand || "Marca"}</span>
                          <span className="shrink-0 text-[10px] font-bold px-1 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">{stock} un.</span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 leading-tight line-clamp-2 min-h-[2rem]">{prodName || "Nombre del producto"}</p>
                        <p className="text-sm font-black text-blue-700 mt-1 font-mono">S/ {precio.toFixed(2)}</p>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Rentabilidad</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          ["Ganas por unidad", `S/ ${gan.toFixed(2)}`, tono],
                          ["Margen", `${margen.toFixed(0)} %`, tono],
                          ["Inviertes en stock", `S/ ${(costo * stock).toFixed(2)}`, "slate"],
                          ["Si vendes todo", `S/ ${(gan * stock).toFixed(2)}`, tono],
                        ].map(([t, v, c]) => (
                          <div key={t} className={`rounded-xl border p-2.5 ${TONO_CAJA[c][0]}`}>
                            <span className={`block text-[10px] font-bold uppercase ${TONO_CAJA[c][1]}`}>{t}</span>
                            <span className={`block text-base font-black font-mono ${TONO_CAJA[c][2]}`}>{v}</span>
                          </div>
                        ))}
                      </div>
                      <ul className="mt-2.5 space-y-1 text-[11px] text-slate-600">
                        <li>{gan <= 0 ? "⚠️ El precio de venta no cubre el costo: revisa los montos." : margen < 20 ? "⚠️ Margen bajo: para suplementos se suele trabajar sobre 25–40 %." : "✓ Buen margen para este tipo de producto."}</li>
                        <li>🔔 Te avisaremos cuando queden {Number(prodMinStock) || 0} unidades o menos (alerta de stock en la campana y en Ventas).</li>
                        <li>📦 Cada entrada, venta y anulación queda en el kárdex del producto.</li>
                      </ul>
                    </div>
                  </div>
                );
              })()}

              {/* Contexto de la tienda: la categoría elegida y lo que falta reponer */}
              {(() => {
                const enCat = (products || []).filter((x) => x.category === prodCategory);
                const prom = enCat.length ? enCat.reduce((a, x) => a + Number(x.salePrice || 0), 0) / enCat.length : 0;
                const stockCat = enCat.reduce((a, x) => a + Number(x.stock || 0), 0);
                const reponer = (lowStockProducts || []).slice(0, 4);
                return (
                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                    <div>
                      <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">En esta categoría</span>
                      <div className="grid grid-cols-3 gap-2">
                        {[["Productos", enCat.length], ["Precio promedio", `S/ ${prom.toFixed(2)}`], ["Unidades en stock", stockCat]].map(([t, v]) => (
                          <div key={t} className="rounded-xl border border-gray-200 bg-white p-2.5">
                            <span className="block text-[10px] font-bold uppercase text-slate-500">{t}</span>
                            <span className="block text-base font-black font-mono text-slate-900">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Por reponer en la tienda</span>
                      {reponer.length ? (
                        <ul className="rounded-xl border border-amber-200 bg-amber-50 divide-y divide-amber-100">
                          {reponer.map((x) => (
                            <li key={x.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs">
                              <span className="truncate text-slate-800">{x.name}</span>
                              <span className="shrink-0 font-bold text-amber-800">quedan {x.stock ?? 0}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-800">✓ Todo el stock está por encima de su mínimo.</p>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="lg:col-span-2 flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-3.5 py-1.5 text-gray-500 hover:text-slate-800 cursor-pointer font-semibold"
                >
                  Cancelar
                </button>
                {errorProducto && <span className="mr-auto text-xs font-bold text-rose-600">{errorProducto}</span>}
                <button
                  type="submit"
                  disabled={guardandoProducto}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-md shadow-xs cursor-pointer transition-all"
                >
                  {guardandoProducto ? "Guardando…" : editingProduct ? "Actualizar Producto" : "Guardar Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POS Receipt Modal */}
      {lastReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
          <div className="w-full max-w-3xl mx-auto min-h-full sm:px-8 sm:py-8 bg-white p-5 text-slate-800">
            <div className="flex items-center justify-between gap-2 mb-2 print:hidden">
              <BotonVolver onClick={cerrarTicket} />
              <BotonCerrar onClick={cerrarTicket} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_250px] gap-5 items-start">
            {/* El ticket, como papel */}
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-5">
            <div className="text-center pb-3 border-b border-dashed border-gray-200">
              <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-1.5">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900 tracking-wide">RADICAL</h3>
              <p className="text-xs text-gray-500">Ticket de venta (uso interno)</p>
              <p className="text-sm font-mono text-blue-700 font-bold mt-0.5">{lastReceipt.receiptNumber}</p>
            </div>

            <div className="my-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <span className="text-gray-500">Fecha</span>
                <span className="text-right font-semibold text-slate-800">{lastReceipt.dateTime ? String(lastReceipt.dateTime).slice(0, 16).replace("T", " ") : lastReceipt.date}</span>
                <span className="text-gray-500">Pago</span>
                <span className="text-right uppercase font-bold text-slate-800">{lastReceipt.paymentMethod}</span>
                <span className="text-gray-500">Cliente</span>
                <span className="text-right font-bold text-slate-900 truncate">{lastReceipt.relatedMemberName || "Cliente Mostrador"}</span>
                {lastReceipt.seller && (
                  <>
                    <span className="text-gray-500">Atendió</span>
                    <span className="text-right font-bold text-slate-900 truncate">{lastReceipt.seller}</span>
                  </>
                )}
              </div>
              {lastReceipt.voided && <p className="text-center font-black text-rose-600">VENTA ANULADA</p>}

              {/* Items */}
              <div className="border-t border-b border-dashed border-gray-200 py-2.5 space-y-1.5">
                {lastReceipt.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between gap-3 text-sm">
                    <span className="text-slate-700 min-w-0">
                      <b className="font-mono">{it.quantity}×</b> {it.productName}
                    </span>
                    <span className="font-mono font-semibold text-slate-900 whitespace-nowrap">S/ {(it.total || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="font-bold text-slate-700">TOTAL PAGADO</span>
                <span className="font-black text-emerald-700 text-xl font-mono">S/ {(lastReceipt.amount || 0).toFixed(2)}</span>
              </div>
            </div>
            </div>

            {/* Acciones */}
            <div className="space-y-2 print:hidden">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total</p>
              <p className="text-3xl font-black text-emerald-700 font-mono leading-none">S/ {(lastReceipt.amount || 0).toFixed(2)}</p>
              <p className="text-xs text-slate-500 pb-2">{lastReceipt.items?.reduce((n, it) => n + Number(it.quantity || 0), 0) || 0} producto(s)</p>
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
              <BotonesDescarga nombre={`Boleta_${lastReceipt?.id || ""}`} className="w-full [&>button]:flex-1 [&>button]:justify-center" />
              <button
                onClick={cerrarTicket}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black shadow-xs cursor-pointer"
              >
                Aceptar
              </button>
            </div>
            </div>

            {/* ¿Se cobró mal? Corregir o anular */}
            {!lastReceipt.voided && lastReceipt.id && (
              <div className="mt-4 pt-3 border-t border-dashed border-gray-200 print:hidden">
                {!accionTicket ? (
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                    <span className="text-slate-500">¿Hubo un error?</span>
                    {puedeEliminar ? (
                      <>
                        <button type="button" onClick={() => setAccionTicket("corregir")} className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-bold cursor-pointer">
                          <Edit3 className="inline w-3.5 h-3.5 -mt-0.5" /> Corregir venta
                        </button>
                        <button type="button" onClick={() => setAccionTicket("anular")} className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold cursor-pointer">
                          <X className="inline w-3.5 h-3.5 -mt-0.5" /> Anular venta
                        </button>
                      </>
                    ) : (
                      <span className="text-slate-500">Pide a administración que la corrija o anule desde «Ventas y reportes».</span>
                    )}
                  </div>
                ) : (
                  <form onSubmit={ejecutarAccionTicket} className={`rounded-xl border p-3 space-y-2 text-xs ${accionTicket === "corregir" ? "bg-amber-50 border-amber-200" : "bg-rose-50 border-rose-200"}`}>
                    <p className="font-bold text-slate-800">
                      {accionTicket === "corregir"
                        ? "Se anula este ticket, el stock vuelve y los productos regresan al carrito para que cambies lo necesario y cobres de nuevo."
                        : "Se anula la venta: los productos vuelven al stock y se quita el ingreso de la caja."}
                    </p>
                    <input
                      autoFocus
                      value={motivoTicket}
                      onChange={(e) => setMotivoTicket(e.target.value)}
                      placeholder={accionTicket === "corregir" ? "Qué se corrige (opcional). Ej. cantidad equivocada" : "Motivo. Ej. se cobró dos veces"}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                    />
                    {errorTicket && <p className="font-bold text-rose-600">{errorTicket}</p>}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setAccionTicket(null); setErrorTicket(""); }} className="flex-1 py-2 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 cursor-pointer">
                        Cancelar
                      </button>
                      <button disabled={procesandoTicket} className={`flex-1 py-2 rounded-lg font-black text-white cursor-pointer disabled:opacity-60 ${accionTicket === "corregir" ? "bg-amber-600" : "bg-rose-600"}`}>
                        {procesandoTicket ? "Procesando…" : accionTicket === "corregir" ? "Anular y corregir" : "Anular venta"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
