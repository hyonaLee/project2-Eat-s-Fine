const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const { User } = require("../models/User");

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;
//auth라는 미들웨어 : 요청(get)받았을 때 콜백함수 하기전에 중간에서 실행
router.get("/auth", auth, (req, res) => {
  //미들웨어를 통과하면 이하 작업을 실행(Authentication이 true)
  res.status(200).json({
    // auth.js에서 user를 req에 넣었기 때문에 가능(req.user = user)
    _id: req.user._id,
    isAdmin: req.user.role === 0 ? false : true, //0 일반, 1 관리자
    isAuth: true,

    userid: req.user.userid,
    email: req.user.email,
    name: req.user.name,
    lastname: req.user.lastname,
    role: req.user.role,
    image: req.user.image,
    keep: req.user.keep,
    comments: req.user.comment,
  });
});

router.post("/register", (req, res) => {
  console.log("클라이언트에서 서버로 받아온 값", req.body);

  User.findOne({ userid: req.body.userid }, (err, userinfo) => {
    if (userinfo) {
      console.log("같은아이디 있음");
      return res.json({
        registerSuccess: false,
        message: "이미 동일한 유저아이디가 존재합니다..",
      });
    }
    User.findOne({ email: req.body.email }, (err, userinfo) => {
      if (userinfo) {
        console.log("같은이메일 있음", userinfo);
        return res.json({
          registerSuccess: false,
          message: "이미 동일한 이메일이 존재합니다..",
        });
      }
      const user = new User(req.body); //req.body로 json형식으로 파싱
      user.save((err, rslt) => {
        if (err) {
          return res.json({ success: false, err });
        } else {
          return res.status(200).json({ success: true });
        }
      });
    });
  });
});

router.post("/login", (req, res) => {
  //요청(입력)한 아이디가 디비에 있는지 찾음
  User.findOne({ userid: req.body.userid }, (err, user) => {
    if (!user) {
      return res.json({
        loginSuccess: false,
        message: "입력한 아이디에 해당하는 유저가 존재하지 않음",
      });
    }
    //요청한 이메일이 디비에 있다면 요청한 비밀번호가 맞는 비밀번호인지 확인
    user.comparePassword(req.body.password, (err, isMatch) => {
      if (!isMatch) {
        return res.json({
          loginSuccess: false,
          message: "비밀번호가 틀렸습니다.",
        });
      } else {
        //비밀번호도 맞는게 확인되면 토큰 생성
        user.createToken((err, user) => {
          if (err) return res.status(400).send(err);

          //쿠키에 토큰 저장
          res
            .cookie("x_auth", user.token)
            .status(200)
            .json({ loginSuccess: true, userID: user._id });
        });
      }
    });
  });
});

router.get("/logout", auth, (req, res) => {
  User.findOneAndUpdate({ _id: req.user._id }, { token: "" }, (err, user) => {
    if (err) return res.json({ logoutSuccess: false, err });
    return res.status(200).send({ logoutSuccess: true });
  });
});

router.post("/addKeep", auth, (req, res) => {
  //User Collection에서 해당 유저의 정보가져오기
  User.findOne({ _id: req.user._id }, (err, userInfo) => {
    let duplicate = false;

    userInfo.keep.forEach((item) => {
      if (item.id === req.body.id) {
        duplicate = true;
      }
    });

    //가져온 정보에서 카트에다 넣으려하는 상품이 이미 들어있는지 확인

    //상품이 이미 있을때
    if (duplicate) {
      if (err) return res.status(400).json({ success: false, err });
      res.status(200).send(userInfo.keep);
    }
    //상품을 처음 등록할때
    else {
      User.findOneAndUpdate(
        { _id: req.user._id },
        {
          $push: {
            keep: {
              id: req.body.id,
              place_name: req.body.place_name,
              phone: req.body.phone,
              address_name: req.body.address_name,
              road_address_name: req.body.road_address_name,
              place_url: req.body.place_url,
              date: Date.now(),
            },
          },
        },
        { new: true },
        (err, userInfo) => {
          if (err) return res.status(200).json({ success: false, err });
          res.status(200).send(userInfo.keep);
        }
      );
    }
  });
});

//찜한거 선택해서 삭제
router.post("/deleteKeep", auth, (req, res) => {
  // User Collection에서 해당 유저의 정보가져오기
  User.findOne({ _id: req.user._id }, (err, userInfo) => {
    userInfo.keep.forEach((item) => {
      if (item.id === req.body.id) {
        User.findOneAndUpdate(
          { _id: req.user._id },
          {
            $pull: {
              keep: {
                id: req.body.id,
              },
            },
          },
          { new: true },
          (err, userInfo) => {
            if (err) return res.status(200).json({ success: false, err });
            res.status(200).send(userInfo.keep);
          }
        );
      }
    });
  });
});

//찜한거 개별 코멘트달기
router.post("/addComment", auth, (req, res) => {
  User.findOne({ _id: req.user._id }, (err, userInfo) => {
    userInfo.keep.forEach((item) => {
      console.log("가져온정보", req.body);
      if (item.id === req.body.storeid) {
        console.log("선택된 킵정보", item.id);
        User.findOneAndUpdate(
          { _id: req.user._id, "keep.id": req.body.storeid },
          { $push: { "keep.$.comment": req.body.content } },
          { new: true },
          (err, userInfo) => {
            if (err) return res.status(200).json({ success: false, err });
            res.status(200).send(userInfo.keep);
          }
        );
      }
    });
  });
});

//0819작업
router.post("/changeEmail", auth, (req, res) => {
  User.findOneAndUpdate(
    { _id: req.user._id },
    { $set: { email: req.body.email } },
    { new: true }, // 이거 써줘야 바로바로 수정된거 반영됨
    (err, userInfo) => {
      if (err) return res.json({ Success: false, err });
      else {
        console.log("유저인포", userInfo);
        console.log("유저인포이메일", userInfo.email);
        return res.status(200).send(userInfo);
      }
    }
  );
});

router.post("/changePassword", auth, (req, res) => {
  if (req.body.password) {
    bcrypt.genSalt(10, function (err, salt) {
      if (err) return res.json({ Success: false, err });
      bcrypt.hash(req.body.password, salt, function (err, hash) {
        if (err) return res.json({ Success: false, err });
        req.body.password = hash;
        console.log("변경됨", req.body.password);
        User.findOneAndUpdate(
          { _id: req.user._id },
          { $set: { password: req.body.password } },
          { new: true }, // 이거 써줘야 바로바로 수정된거 반영됨
          (err, userInfo) => {
            if (err) return res.json({ Success: false, err });
            else {
              console.log("유저인포패스워드", userInfo.password);
              return res.status(200).send(userInfo);
            }
          }
        );
      });
    });
  }
});

router.post("/deleteUser", auth, (req, res) => {
  req.user.comparePassword(req.body.password, (err, isMatch) => {
    if (!isMatch) {
      console.log("비번틀림");
      return res.json({
        deleteSuccess: false,
        message: "비밀번호가 틀렸습니다.",
      });
    } else {
      User.deleteOne({ _id: req.user._id }, (err, userInfo) => {
        if (err) return res.json({ deleteSuccess: false, err });
        else {
          console.log("삭제완료");
          return res.status(200).send({ deleteSuccess: true });
        }
      });
    }
  });
});

module.exports = router;
