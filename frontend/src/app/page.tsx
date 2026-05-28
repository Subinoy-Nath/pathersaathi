
"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import logo from "../../images/logo.jpeg";
import bus1 from "../../images/bus1.jpg";
import bus2 from "../../images/bus2.jpg";
import bus3 from "../../images/bus3.jpg";
import bus4 from "../../images/bus4.jpg";
import bus5 from "../../images/bus5.jpg";
import bus6 from "../../images/bus6.jpg";
import bus7 from "../../images/bus7.jpg";
import bus8 from "../../images/bus8.jpg";
import bus9 from "../../images/bus9.jpg";
import bus10 from "../../images/bus10.jpg";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedBuses, setSelectedBuses] = useState<number[]>([]);

  const busesRef = useRef<HTMLElement | null>(null);
  const toggleBusSelection = (busId: number) => {

      setSelectedBuses((prev) =>

      prev.includes(busId)
      ? prev.filter((id) => id !== busId)
      : [...prev, busId]

    );

  };
  const buses = [

    {
    id: 1,
    name: "Shibam Coach 01",
    image: bus1,
    features: "AC • Luxury • Charging",
    capacity: "40 Seats",
    Bus_number: "AS10D5047",
    },

    {
    id: 2,
    name: "Shibam Coach 02",
    image: bus2,
    features: "AC • Luxury • Charging",
    capacity: "38 Seats",
    Bus_number: "AS10D5047",
    },

    {
    id: 3,
    name: "Shibam Coach 03",
    image: bus3,
    features: "AC • Luxury • Charging",
    capacity: "38 Seats",
    Bus_number: "AS10D5047",
    },

    {
    id: 4,
    name: "Shibam Coach 04",
    image: bus4,
    features: "AC • Luxury • Charging",
    capacity: "32 Seats",
    Bus_number: "AS10D5047",
    },

    {
    id: 5,
    name: "Shibam Coach 05",
    image: bus5,
    features: "AC • Luxury • Charging",
    capacity: "32 Seats",
    Bus_number: "AS10D5047",
    },
    {
    id: 6,
    name: "Shibam Coach 06",
    image: bus6,
    features: "Non-AC",
    capacity: "30 Seats",
    Bus_number: "AS10D5047",
    },
    {
    id: 7,
    name: "Shibam Coach 07",
    image: bus7,
    features: "Non-AC",
    capacity: "30 Seats",
    Bus_number: "AS10D5047",
    },
    {
    id: 8,
    name: "Shibam Coach 08",
    image: bus8,
    features: "Non-AC",
    capacity: "30 Seats",
    Bus_number: "AS10D5047",
    },
    {
    id: 9,
    name: "Shibam Coach 09",
    image: bus9,
    features: "Non-AC",
    capacity: "30 Seats",
    Bus_number: "AS10D5047",
    },
    {
    id: 10,
    name: "Shibam Coach 10",
    image: bus10,
    features: "Non-AC",
    capacity: "30 Seats",
    Bus_number: "AS10D5047",
    }
  ];
  const openBuses = () => {

      if (busesRef.current) {

        const y =
        busesRef.current.getBoundingClientRect().top +
        window.pageYOffset -
        50;

        window.scrollTo({
        top: y,
        behavior: "smooth",
        });

      }
  };
  

  return (
    <>

      {/* Navbar */}

      <nav className="shadow-md fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md">

        <div className="max-w-7xl mx-auto px-6">

          <div className="flex justify-between items-center h-16">

            <div className="flex items-center gap-3">

              <Image
              src={logo}
              alt="Pather Saathi Logo"
              width={275}
              height={175}
              className="rounded-full"
              />

            </div>

            {/* Desktop Menu */}

            <div className="hidden md:flex items-center gap-8">

              <a href="/" className="text-black font-medium">
              Home
              </a>

              <a href="/bookings" className="text-black font-medium">
              Bookings
              </a>

              <a onClick={openBuses} type="button" className="text-black font-medium cursor-pointer">
              Buses
              </a>

              <a href="/login" className="text-black font-medium">
              Login
              </a>

            </div>

            {/* Menu Button */}

            <button
              className="
              md:hidden
              p-3
              rounded-lg
              text-black
              text-3xl
              "
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? "✕" : "☰"}
            </button>

          </div>

          {/* Mobile Menu */}

          {menuOpen && (

          <div
          className="
          absolute
          right-6
          top-20
          w-48
          bg-white
          rounded-xl
          shadow-xl
          p-3
          flex
          flex-col
          gap-2
          md:hidden
          z-50
          "
          >

            <a
            href="/"
            className="text-black px-4 py-3 hover:bg-gray-50 rounded-lg"
            >
            Home
            </a>

            <a
            href="/bookings"
            className="text-black px-4 py-3 hover:bg-gray-50 rounded-lg"
            >
            Bookings
            </a>

            <button
            type="button"
            onClick={() => {

            setMenuOpen(false);

            requestAnimationFrame(() => {
            setTimeout(() => {
            openBuses();
            }, 250);

            });

            }}
            className="
            text-left
            text-black
            px-4
            py-3
            hover:bg-gray-50
            rounded-lg
            w-full
            "
            >
            Buses
            </button>

            <a
            href="/login"
            className="text-black px-4 py-3 hover:bg-gray-50 rounded-lg"
            >
            Login
            </a>

          </div>

          )}

        </div>

      </nav>

      {/* Hero Section */}

      <main
        className="
        pt-16
        relative
        min-h-screen
        overflow-hidden
        bg-linear-to-br
        from-purple-50
        via-orange-50
        to-white
        "
        >

        {/* Blur Glow */}

        <div
        className="
        absolute
        -top-37.5
        -left-25
        w-175
        h-175
        rounded-full
        bg-purple-200
        blur-3xl
        opacity-40
        "
        />

          <div
            className="
            absolute
            -bottom-37.5
            -right-25
            w-175
            h-175
            rounded-full
            bg-orange-200
            blur-3xl
            opacity-40
            "
            />

            <section
              className="
              relative
              z-10
              min-h-[calc(100vh-64px)]
              flex
              flex-col
              justify-center
              items-center
              text-center
              px-6
              "
              >

                <h1
                  className="
                  pt-25
                  text-5xl
                  md:text-7xl
                  font-bold
                  text-black
                  "
                  >
                  Travel Smarter
                </h1>
                {/* Booking Form */}

                <div
                  className="
                  mt-10
                  bg-white
                  rounded-2xl
                  shadow-xl
                  p-6
                  w-half
                  max-w-3xl
                  grid
                  grid-cols-1
                  md:grid-cols-2
                  gap-5
                  "
                  >

                  {/* Pickup */}

                  <div>

                    <label
                      className="
                      block
                      text-lg
                      font-bold
                      text-gray-700
                      mb-2
                      "
                      >
                      Pickup
                    </label>

                    <select
                      className="
                      w-half
                      border
                      border-gray-200
                      rounded-xl
                      px-4
                      py-3
                      outline-none
                      focus:ring-2
                      focus:ring-purple-200                        "
                      >

                      <option>Select Pickup</option>

                      <option>Silchar</option>

                      <option>Sribhumi</option>

                      <option>Patherkandi</option>

                      <option>Lowairpoa</option>

                      <option>Bazarichera</option>

                      <option>Kotamoni</option>

                    </select>

                  </div>

                  {/* Destination */}

                  <div>

                    <label
                      className="
                      block
                      text-lg
                      font-bold
                      text-gray-700
                      mb-2
                      "
                      >
                      Destination
                    </label>

                    <select
                      className="
                      w-half
                      border
                      border-gray-200
                      rounded-xl
                      px-4
                      py-3
                      outline-none
                      focus:ring-2
                      focus:ring-orange-200
                      "
                      >

                      <option>Select Destination</option>

                      <option>Silchar</option>

                      <option>Sribhumi</option>

                      <option>Patherkandi</option>

                      <option>Lowairpoa</option>

                      <option>Bazarichera</option>

                      <option>Kotamoni</option>

                    </select>

                  </div>
                  {/* Number of Seats */}

                  <div className="md:col-span-2">

                    <label
                      className="
                      block
                      text-sm
                      font-semibold
                      text-gray-700
                      mb-2
                      "
                      >
                      Number of Seats
                    </label>

                    <select
                        className="
                        w-full
                        border
                        border-gray-200
                        rounded-xl
                        px-4
                        py-3
                        outline-none
                        focus:ring-2
                        focus:ring-purple-200
                        "
                        >

                        <option>Select Seats</option>

                        {Array.from(
                        { length: 20 },
                        (_, i) => (

                          <option
                            key={i + 1}
                            value={i + 1}
                            >

                            {i + 1} Seats

                          </option>

                        )
                      )}

                    </select>

                  </div>
                  {/* Book Tickets Button */}

                  <div className="md:col-span-2">

                    <button
                      className="
                      w-full
                      mt-4
                      bg-purple-100
                      text-black
                      py-3
                      rounded-xl
                      font-semibold
                      hover:bg-purple-200
                      transition
                      duration-300
                      "
                      >

                      Book Tickets

                    </button>

                  </div>
                </div>
                <p
                  className="
                  mt-6
                  text-lg
                  text-gray-700
                  max-w-2xl
                  "
                  >
                  Book buses and manage fleet journeys with
                  Pather Saathi.
                </p>

                {/* Book Whole Bus Button */}

                <div onClick={openBuses} className="md:col-span-2">

                  <button
                    className="
                    w-full
                    mt-10
                    p-4
                    rounded-2xl
                    bg-purple-50
                    text-black
                    font-semibold
                    text-lg
                    hover:bg-purple-100
                    transition
                    duration-300
                    "
                    >

                    Book Whole Bus

                  </button>

                </div>

            </section>

            <section ref={busesRef} className="px-6 py-16">

              <div className="flex justify-between items-center mt-10 ">

                <h2
                  className="
                  text-4xl
                  font-bold
                  "
                  >
                  Select Bus
                </h2>

                <button
                  className="
                  px-8
                  py-3
                  bg-black
                  text-white
                  rounded-xl
                  font-semibold
                  hover:opacity-90
                  "
                  >
                  Book Now
                </button>

              </div>

              <p className="mb-8 text-gray-600">
                Selected: {selectedBuses.length} buses
              </p>

              <div
                className="
                grid
                grid-cols-1
                md:grid-cols-2
                lg:grid-cols-3
                gap-8
                "
                >

                {buses.map((bus) => {

                const selected =
                selectedBuses.includes(bus.id);

                return (

                <div
                  key={bus.id}
                  className={`
                  bg-white
                  rounded-3xl
                  overflow-hidden
                  shadow-lg
                  border-4
                  transition
                  ${
                  selected
                  ? "border-green-500"
                  : "border-transparent"
                  }
                  `}
                  >

                  <Image
                  src={bus.image}
                  alt={bus.name}
                  width={600}
                  height={350}
                  className="
                  w-full
                  h-60
                  object-contain
                  "
                  />

                  <div className="p-6">

                    <h3 className="text-2xl font-bold">
                      {bus.name}
                    </h3>

                    <p className="mt-3 text-gray-600">
                      {bus.features}
                    </p>

                    <p className="mt-2 text-gray-600">
                      Capacity: {bus.capacity}
                    </p>

                    <p className="mt-2 font-semibold">
                      {bus.Bus_number}
                    </p>

                    <button
                      onClick={() =>
                      toggleBusSelection(bus.id)
                      }
                      className={`
                      mt-5
                      w-full
                      py-3
                      rounded-xl
                      font-semibold
                      ${
                      selected
                      ? "bg-green-600 text-white"
                      : "bg-black text-white"
                      }
                      `}
                      >

                      {
                      selected
                      ? "Selected ✓"
                      : "Select"
                      }

                    </button>

                  </div>

                </div>

                );

                })}

              </div>


            </section>

            </main>
            <hr/>
            {/* Footer */}

            <footer
              className="
              bg-gray-200
              text-black
              px-8
              py-12
              "
              >

              <div
                className="
                max-w-7xl
                mx-auto
                flex
                flex-row
                justify-between
                items-center
                gap-6
                "
                >

                {/* Contact Section */}

                <div>

                  <h2
                    className="
                    text-3xl
                    font-bold
                    mb-6
                    "
                    >
                    Contact Us
                  </h2>

                  <p className="mb-3">
                    📧 Email:
                    pathersaathi@gmail.com
                  </p>

                  <p className="mb-3">
                    📞 Phone:
                    +91 6002089037
                  </p>

                  <p>
                    📍 Address:
                    Sribhumi, Assam, India
                  </p>

                </div>

                {/* Logo Section */}

                <div
                  className="
                  flex
                  flex-col
                  items-center
                  justify-center
                  "
                  >

                <Image
                  src={logo}
                  alt="Pather Saathi"
                  width={120}
                  height={120}
                  className="rounded-full"
                />

                <h3
                  className="
                  mt-4
                  text-2xl
                  font-bold
                  "
                  >
                  Pather Saathi
                </h3>

                <p className="text-gray-400 mt-2">
                  Your Journey Partner
                </p>

              </div>

              </div>

              <div
                className="
                border-t
                border-gray-700
                mt-10
                pt-5
                text-center
                text-gray-400
                "
                >

                © 2026 Pather Saathi.
                All Rights Reserved.

              </div>

            </footer>

      </>
    );
}