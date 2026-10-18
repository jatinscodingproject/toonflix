const User = require("../Models/models.customer");
const axios = require('axios');

const Customer = async (req, res) => {
  const { phone_number, real_ip, subid , origin } = req.body;
  console.log(req.headers);
  console.log("req.body", req.body);
  // const origin = req.headers.origin || null;
  // const referer = req.headers.referer || null;
  // const clientIp =
  //     req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  //     req.headers['x-real-ip'] ||
  //     req.socket.remoteAddress ||
  //     null;

  const rawIp = req.ip;
  const clientIp = rawIp?.startsWith("::ffff:")
    ? rawIp.replace("::ffff:", "")
    : rawIp;

  try {
    if (!phone_number) {
      return res.status(400).json({
        message: "Phone number is required",
      });
    }

    if (phone_number === "NOT FOUND") {
      return res.status(404).json({
        message: "Phone number not found",
      });
    }

    const sameuser = await User.findOne({
      where: {
        msisdn: phone_number.trim(),
      },
    });

    if (sameuser) {
      return res.status(200).json({
        message: "Customer already exists",
      });
    }

    if (!subid) {
      return res.status(404).json({
        message: "Phone number not from traffic",
      });
    }

    const user = await User.findOne({
      where: {
        msisdn: phone_number,
        origin: origin,
        referer: origin,
        client_ip: real_ip,
      },
    });

    if (user) {
      return res.status(200).json({
        message: "Customer already found",
        origin,
        referer,
        client_ip: real_ip,
      });
    }

    await User.create({
      msisdn: phone_number,
      origin: origin,
      referer: origin,
      client_ip: real_ip,
    });

    if (origin === "https://sl.yumzyy.com") {
      try {
        const postbackUrl = `https://url.promotrking.com/advertiser/advertiser-callback?client=BN&service=Yumzy&publisher=BMD&ext_ref=${subid}`;

        const response = await axios.get(postbackUrl);

        console.log("Postback Sent Successfully:", response.data);
      } catch (postbackError) {
        console.error("Postback Failed:", postbackError.message);
      }
    }

    if (origin === "https://sl.eduwav.com") {
      try {
        const postbackUrl = `https://url.promotrking.com/advertiser/advertiser-callback?client=BN&service=Eduw&publisher=BMD&ext_ref=${subid}`;

        const response = await axios.get(postbackUrl);

        console.log("Postback Sent Successfully:", response.data);
      } catch (postbackError) {
        console.error("Postback Failed:", postbackError.message);
      }
    }

   

    return res.status(200).json({
      message: "Customer stored successfully",
      origin,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

module.exports = Customer;
